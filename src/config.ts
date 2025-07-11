import * as path from 'path';

export interface Config {
  claudeDir: string;
}

export function getConfig(): Config {
  const claudeDir = process.env.CLAUDE_DIR || path.join(process.env.HOME || '', '.claude', 'projects');

  return {
    claudeDir: claudeDir
  };
}