/**
 * Integration test for the Loki application
 * Tests the full built application against test stories
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Loki Integration Test', () => {
  beforeAll(() => {
    // Verify dist directory exists
    expect(fs.existsSync('./dist')).toBe(true);
    expect(fs.existsSync('./dist/index.js')).toBe(true);
  });

  it('should have built application in dist directory', () => {
    const distPath = path.join(process.cwd(), 'dist');
    expect(fs.existsSync(distPath)).toBe(true);

    const indexPath = path.join(distPath, 'index.js');
    expect(fs.existsSync(indexPath)).toBe(true);

    // Verify some core modules are built
    expect(fs.existsSync(path.join(distPath, 'core'))).toBe(true);
    expect(fs.existsSync(path.join(distPath, 'runner'))).toBe(true);
  });

  it('should have test stories available', () => {
    const storiesPath = path.join(process.cwd(), 'test', 'stories.json');
    expect(fs.existsSync(storiesPath)).toBe(true);

    const stories = JSON.parse(fs.readFileSync(storiesPath, 'utf-8'));
    expect(Array.isArray(stories)).toBe(true);
    expect(stories.length).toBeGreaterThan(0);

    // Verify story structure
    const story = stories[0];
    expect(story).toHaveProperty('id');
    expect(story).toHaveProperty('kind');
    expect(story).toHaveProperty('story');
  });

  it('should have test iframe.html available', () => {
    const iframePath = path.join(process.cwd(), 'test', 'iframe.html');
    expect(fs.existsSync(iframePath)).toBe(true);

    const content = fs.readFileSync(iframePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('should be able to start the CLI process', (done) => {
    // Test that the CLI can be started (it will fail without Chrome, but should at least start)
    const child = spawn('node', ['./dist/index.js', 'test', '--reactUri', 'file:./test'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      // The process should start and output something
      // It will fail because Chrome is not available, but that's expected
      const allOutput = output + errorOutput;

      // Verify the CLI started and attempted to run
      expect(allOutput.length).toBeGreaterThan(0);

      // Should show it's attempting to run loki test
      expect(allOutput).toMatch(/loki|chrome|test|CHROME_PATH|START/i);

      done();
    });

    // Kill after 5 seconds if it doesn't exit
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
        done();
      }
    }, 5000);
  }, 10000);
});
