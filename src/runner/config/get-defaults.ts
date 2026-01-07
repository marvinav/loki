import defaults from './defaults-react.json' with { type: 'json' };

interface Configuration {
  target: string;
  [key: string]: unknown;
}

interface LokiConfig {
  configurations: Record<string, Configuration>;
  [key: string]: unknown;
}

function getDefaults(): LokiConfig {
  return {
    ...defaults,
    configurations: { ...(defaults as LokiConfig).configurations },
  };
}

export default getDefaults;
export type { LokiConfig, Configuration };
