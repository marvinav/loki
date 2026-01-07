# Target Architecture

This document describes the **Target** abstraction in Loki - the system that enables screenshot capture in Chrome browser environments.

## Overview

A **Target** represents a testing environment capable of rendering stories and capturing screenshots. The current implementation supports the `chrome.app` target which uses a local Chrome installation.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Runner                               │
│                    (src/runner/cli.ts)                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TaskRunner                                 │
│              (src/runner/commands/test/task-runner.ts)          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
                           ┌──────────┐
                           │  Target  │
                           │chrome.app│
                           └──────────┘
```

## Target Interface

Every target must implement the following interface:

```typescript
interface Target {
  /**
   * Optional preparation step before starting.
   * Use for one-time setup tasks.
   */
  prepare?: () => Promise<void>;

  /**
   * Starts the target environment.
   * Called once before running any tests.
   */
  start: () => Promise<void>;

  /**
   * Stops the target environment.
   * Called after all tests complete (or on error for cleanup).
   */
  stop: () => Promise<void>;

  /**
   * Retrieves the list of stories to test.
   * Returns story metadata including id, kind, story name, and parameters.
   */
  getStorybook: () => Promise<Story[]>;

  /**
   * Captures a screenshot for a specific story.
   * @param storyId - Unique identifier for the story
   * @param options - Global CLI options
   * @param configuration - Target-specific configuration (viewport, preset, etc.)
   * @param parameters - Story-level parameters from story metadata
   * @returns Screenshot as PNG Buffer, or undefined if capture fails
   */
  captureScreenshotForStory: (
    storyId: string,
    options: Options,
    configuration: Configuration,
    parameters: StoryParameters
  ) => Promise<Buffer | undefined>;
}
```

### Story Type

```typescript
interface Story {
  id: string;           // Unique story identifier
  kind: string;         // Story group/component name
  story: string;        // Individual story name
  url?: string;         // URL to render the story
  parameters?: {
    loki?: {
      chromeSelector?: string;  // Custom element selector
      skip?: boolean;           // Skip this story
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}
```

## Target Lifecycle

When tests run, each target goes through a defined lifecycle managed by the TaskRunner:

```
┌──────────────────────────────────────────────────────────────┐
│                    Target Lifecycle                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. PREPARE (optional)                                        │
│     └── target.prepare()                                      │
│         One-time setup tasks                                  │
│                                                               │
│  2. START                                                     │
│     └── target.start()                                        │
│         Launch browser, connect to debugger                   │
│                                                               │
│  3. FETCH_STORIES                                             │
│     └── target.getStorybook()                                 │
│         Load story list from stories.json or storybook API    │
│                                                               │
│  4. TESTS (parallel per configuration)                        │
│     └── target.captureScreenshotForStory(...)                 │
│         For each story: navigate, wait, capture, compare      │
│                                                               │
│  5. STOP                                                      │
│     └── target.stop()                                         │
│         Kill browser, cleanup resources                       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Implementation: Chrome App Target

The primary target implementation is `chrome.app` which uses a local Chrome installation.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    createChromeAppTarget                     │
│               (src/target-chrome-app/)                       │
├─────────────────────────────────────────────────────────────┤
│  • Launches Chrome via chrome-launcher                       │
│  • Manages static file server for local files                │
│  • Creates CDP debugger connections                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    createChromeTarget                        │
│               (src/target-chrome-core/)                      │
├─────────────────────────────────────────────────────────────┤
│  • Device emulation (viewport, scale, mobile)                │
│  • Media query emulation                                     │
│  • Network request monitoring                                │
│  • Browser helper injection                                  │
│  • Screenshot capture via CDP                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Browser Helpers                           │
│                    (src/browser/)                            │
├─────────────────────────────────────────────────────────────┤
│  • disableAnimations - Freeze CSS animations                 │
│  • disableInputCaret - Hide text cursors                     │
│  • disablePointerEvents - Remove hover states                │
│  • awaitLokiReady - Wait for page stabilization              │
│  • getSelectorBoxSize - Calculate element dimensions         │
│  • populateLokiHelpers - Setup window.loki global            │
└─────────────────────────────────────────────────────────────┘
```

### Chrome Target Flow

```typescript
// 1. Create target with options
const target = createChromeAppTarget({
  baseUrl: 'file:./storybook-static/iframe.html',
  chromeFlags: ['--disable-gpu', '--hide-scrollbars'],
  storiesPath: './stories.json',
});

// 2. Start Chrome
await target.start();
// → Launches Chrome with specified flags
// → Starts static server if needed

// 3. Get stories
const stories = await target.getStorybook();
// → Reads stories from stories.json file

// 4. Capture screenshot for each story
for (const story of stories) {
  const screenshot = await target.captureScreenshotForStory(
    story.id,
    options,        // CLI options
    configuration,  // { preset: 'iPhone 7', chromeSelector: '#root' }
    story.parameters
  );
  // → Opens new tab
  // → Injects browser helpers
  // → Navigates to story URL
  // → Waits for ready state
  // → Captures screenshot of selector
  // → Closes tab
}

// 5. Stop Chrome
await target.stop();
```

## Browser Helpers

Browser helpers are functions injected into the page before navigation to ensure consistent screenshots.

| Helper | Purpose |
|--------|---------|
| `disableAnimations` | Freezes all CSS animations and transitions |
| `disableInputCaret` | Hides blinking text cursors |
| `disablePointerEvents` | Removes hover/focus states |
| `setLokiIsRunning` | Sets `window.loki.isRunning = true` |
| `setLokiTestAttribute` | Adds `data-loki-test` attribute to body |
| `awaitLokiReady` | Waits for `window.loki.awaitReady()` |
| `awaitSelectorPresent` | Waits for element to exist in DOM |
| `getSelectorBoxSize` | Returns bounding box for screenshot |
| `populateLokiHelpers` | Sets up `window.loki` API |

### Ready State Management

Stories can signal when they're ready for capture:

```typescript
// In your story/component
window.loki?.registerPendingPromise?.(
  fetch('/api/data').then(/* ... */)
);

// Or use awaitReady for custom timing
if (window.loki?.isRunning) {
  await window.loki.awaitReady?.();
}
```

## Configuration Precedence

When determining options for a screenshot, values are merged in this order (later overrides earlier):

```
1. CLI Options (lowest priority)
   └── --chromeSelector, --chromeLoadTimeout, etc.

2. Configuration Defaults
   └── loki.json configurations[name]

3. Preset Values
   └── Built-in device presets (iPhone 7, Desktop Chrome, etc.)

4. Story Parameters (highest priority)
   └── story.parameters.loki.chromeSelector
```

## Device Presets

Presets provide pre-configured device settings:

```json
{
  "iPhone 7": {
    "width": 375,
    "height": 667,
    "deviceScaleFactor": 2,
    "mobile": true,
    "userAgent": "Mozilla/5.0 (iPhone; ...)"
  },
  "Desktop Chrome": {
    "width": 1366,
    "height": 768,
    "deviceScaleFactor": 1,
    "mobile": false
  }
}
```

## Extending the Target System

The Target interface allows extending Loki to support additional browser environments. A new target must implement the `start`, `stop`, `getStorybook`, and `captureScreenshotForStory` methods.

```typescript
// src/target-{name}/create-{name}-target.ts

interface MyTargetOptions {
  baseUrl: string;
  storiesPath: string;
}

function createMyTarget(options: MyTargetOptions) {
  async function start(): Promise<void> {
    // Launch browser environment
  }

  async function stop(): Promise<void> {
    // Cleanup resources
  }

  async function getStorybook(): Promise<Story[]> {
    // Return list of stories to test
  }

  async function captureScreenshotForStory(
    storyId: string,
    options: Options,
    configuration: Configuration,
    parameters: StoryParameters
  ): Promise<Buffer | undefined> {
    // Navigate, wait, capture, return PNG buffer
  }

  return { start, stop, getStorybook, captureScreenshotForStory };
}

export default createMyTarget;
```

## Error Handling

Targets should handle common error scenarios:

```typescript
async function captureScreenshotForStory(...) {
  try {
    await withTimeout(options.chromeLoadTimeout)(
      tab.loadUrl(url, selector)
    );
    return await tab.captureScreenshot(selector);
  } catch (err) {
    if (err instanceof TimeoutError) {
      // Page load timeout - log and return undefined
      debug(`Timed out waiting for "${url}" to load`);
      return undefined;
    }
    throw err;  // Re-throw unexpected errors
  } finally {
    await tab.close();  // Always cleanup
  }
}
```

## File Structure

```
src/
├── target-chrome-app/
│   ├── index.ts
│   ├── create-chrome-app-target.ts    # Chrome launcher integration
│   └── find-free-port-sync.ts         # Port allocation utility
│
├── target-chrome-core/
│   ├── index.ts
│   ├── create-chrome-target.ts        # CDP screenshot logic
│   └── presets.json                   # Device presets
│
├── browser/
│   ├── index.ts
│   ├── types.ts                       # Browser type definitions
│   ├── disable-animations.ts
│   ├── disable-input-caret.ts
│   ├── disable-pointer-events.ts
│   ├── await-loki-ready.ts
│   ├── await-selector-present.ts
│   ├── get-selector-box-size.ts
│   ├── populate-loki-helpers.ts
│   ├── set-loki-is-running.ts
│   └── set-loki-test-attribute.ts
│
├── core/
│   ├── index.ts                       # Barrel exports
│   ├── errors.ts                      # Custom error types
│   ├── failure-handling.ts            # withTimeout, withRetries utilities
│   ├── logger.ts                      # Debug logging (replaces 'debug' package)
│   ├── fs-utils.ts                    # File system utilities (replaces 'fs-extra')
│   ├── object-utils.ts                # Object utilities (replaces 'ramda')
│   ├── mime.ts                        # MIME type detection (replaces 'mime-types')
│   ├── command-exists.ts              # Command detection (replaces 'shelljs')
│   └── concurrent.ts                  # Concurrent execution (replaces 'async')
│
├── diff-looks-same/
│   ├── index.ts
│   └── create-looks-same-differ.ts    # Image comparison using looks-same
│
└── integration-core/
    ├── index.ts
    └── create-ready-state-manager.ts  # Pending promise tracking
```

## TypeScript Migration Status

All components have been migrated to TypeScript:

| Component | Status |
|-----------|--------|
| `src/browser/` | TypeScript |
| `src/target-chrome-app/` | TypeScript |
| `src/target-chrome-core/` | TypeScript |
| `src/runner/commands/test/` | TypeScript |
| `src/runner/commands/approve/` | TypeScript |
| `src/runner/commands/init/` | TypeScript |
| `src/runner/config/` | TypeScript |
| `src/core/` | TypeScript |
| `src/diff-looks-same/` | TypeScript |
| `src/integration-core/` | TypeScript |
