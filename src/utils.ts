import { format, formatDistanceToNow } from 'date-fns';
import chalk from 'chalk';

export function formatDate(date: Date | null): string {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else {
    return format(date, 'MMM d, yyyy');
  }
}

export function formatProjectName(name: string): string {
  // Truncate long project names
  const maxLength = 40;
  if (name.length > maxLength) {
    return name.substring(0, maxLength - 3) + '...';
  }
  return name;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return '< 1m';
  }
}

export function formatConversationLine(
  projectName: string,
  lastMessageTime: Date | null,
  messageCount: number,
  matchCount?: number,
  activeTime?: number,
  summary?: string,
  sessionId?: string
): string {
  // Extract first 6 chars of UUID without dashes
  const shortId = sessionId ? chalk.blue(sessionId.replace(/-/g, '').substring(0, 6)) : '';
  const time = chalk.gray(formatDate(lastMessageTime));
  const count = chalk.yellow(`${messageCount} messages`);
  
  let parts = [shortId, time, count];
  
  if (matchCount !== undefined) {
    parts.push(chalk.green(`${matchCount} matches`));
  }
  
  if (activeTime !== undefined && activeTime > 0) {
    parts.push(chalk.magenta(`${formatDuration(activeTime)} active`));
  }
  
  const mainLine = parts.join(' - ');
  
  // Add summary on a new line if available
  if (summary) {
    const indentedSummary = '  ' + chalk.dim(summary);
    return mainLine + '\n' + indentedSummary;
  }
  
  return mainLine;
}