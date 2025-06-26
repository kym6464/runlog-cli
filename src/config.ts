import * as path from 'path';

export interface Config {
  apiEndpoint: string;
  claudeDir: string;
}

export function getConfig(): Config {
  return {
    apiEndpoint: process.env.RUNLOG_API_ENDPOINT || 'https://api.runlog.io',
    claudeDir: process.env.CLAUDE_DIR || path.join(process.env.HOME || '', '.claude', 'projects')
  };
}