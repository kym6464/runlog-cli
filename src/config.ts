import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export interface Config {
  apiEndpoint: string;
  claudeDir: string;
  clientId: string;
}

const CLIENT_ID_FILE = 'client_id.txt';

export function getConfig(): Config {
  const claudeDir = process.env.CLAUDE_DIR || path.join(process.env.HOME || '', '.claude', 'projects');
  const clientId = getClientId(claudeDir);

  return {
    apiEndpoint: process.env.RUNLOG_API_ENDPOINT || 'https://api.runlog.io',
    claudeDir: claudeDir,
    clientId: clientId
  };
}

function getClientId(claudeDir: string): string {
  const clientIdPath = path.join(claudeDir, CLIENT_ID_FILE);

  if (fs.existsSync(clientIdPath)) {
    return fs.readFileSync(clientIdPath, 'utf8').trim();
  } else {
    const newClientId = randomUUID();
    // Ensure the directory exists
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(clientIdPath, newClientId, 'utf8');
    return newClientId;
  }
}