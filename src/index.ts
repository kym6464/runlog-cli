#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline';
import { ConversationParser } from './parser';
import { ApiClient } from './api';
import { getConfig } from './config';
import { InteractiveSelector } from './interactive-selector';
import { ConversationMetadata } from './types';

async function main() {
  console.log(chalk.bold.blue('\n🔧 runlog - Claude Code Conversation Uploader\n'));

  const config = getConfig();
  const parser = new ConversationParser(config.claudeDir);
  const apiClient = new ApiClient(config.apiEndpoint);
  const currentDir = process.cwd();

  console.log(chalk.gray(`Current directory: ${currentDir}\n`));

  // Step 1: Load conversations
  const loadingSpinner = ora('Loading conversations for this project...').start();

  let conversations: ConversationMetadata[];
  try {
    conversations = await parser.getAllConversations();
    loadingSpinner.succeed(`Found ${conversations.length} conversations`);
  } catch (error) {
    loadingSpinner.fail('Failed to load conversations');
    console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
    process.exit(1);
  }

  if (conversations.length === 0) {
    console.log(chalk.yellow('\nNo conversations found for this project.'));
    console.log(chalk.gray(`Current directory: ${currentDir}`));
    console.log(chalk.gray(`Claude directory: ${config.claudeDir}`));
    process.exit(0);
  }

  // Step 2: Show interactive selection
  const selector = new InteractiveSelector({ conversations, parser });
  const selectedConversation = await selector.select();

  if (!selectedConversation) {
    console.log(chalk.gray('\nCancelled.'));
    process.exit(0);
  }

  // Step 3: Check size limits
  console.log(chalk.gray('\nChecking conversation size...'));

  // Check message count
  const messageCount = selectedConversation.messageCount;
  if (messageCount > 5000) {
    console.log(chalk.red(`\n❌ Conversation too large!\n`));
    console.log(chalk.yellow(`This conversation has ${messageCount} messages.`));
    console.log(chalk.yellow(`Maximum allowed: 5000 messages.\n`));
    process.exit(1);
  }

  // Get content and check size
  let content: string;
  try {
    content = await parser.getConversationContent(selectedConversation.filePath);
  } catch (error) {
    console.error(chalk.red(`\nError reading conversation: ${error instanceof Error ? error.message : error}`));
    process.exit(1);
  }

  const sizeInBytes = Buffer.byteLength(content, 'utf8');
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > 10) {
    console.log(chalk.red(`\n❌ Conversation too large!\n`));
    console.log(chalk.yellow(`This conversation is ${sizeInMB.toFixed(2)} MB.`));
    console.log(chalk.yellow(`Maximum allowed: 10 MB.\n`));
    process.exit(1);
  }

  // Step 4: Add a small delay to ensure the Enter key from conversation selection is not carried over
  await new Promise(resolve => setTimeout(resolve, 100));

  // Create confirmation prompt
  const confirmed = await new Promise<boolean>((resolve) => {
    let selectedOption = 0; // 0 = Yes, 1 = No
    const options = ['Yes, upload', 'No, cancel'];
    let isReady = false; // Flag to prevent immediate triggering

    const render = () => {
      console.clear();
      console.log(chalk.bold.blue('📤 Upload Confirmation\n'));

      console.log(chalk.bold('Selected Conversation:'));
      console.log(chalk.white(`  Summary preview: ${selectedConversation.summary}`));
      console.log(chalk.gray(`  Messages: ${messageCount}`));
      console.log(chalk.gray(`  Size: ${sizeInMB.toFixed(2)} MB`));
      console.log(chalk.gray(`  Last activity: ${selectedConversation.lastMessageTime}`));

      console.log(chalk.bold('\nAfter upload, you will receive a shareable link.\n'));

      console.log(chalk.yellow('Do you want to proceed with the upload?\n'));

      // Render options
      options.forEach((option, index) => {
        if (index === selectedOption) {
          console.log(chalk.cyan(`  ▶ ${option}`));
        } else {
          console.log(chalk.gray(`    ${option}`));
        }
      });

      console.log(chalk.gray('\nUse arrow keys to select, Enter to confirm, Esc to cancel'));
    };

    // Clear any existing keypress listeners and stdin
    process.stdin.removeAllListeners('keypress');
    process.stdin.pause();
    process.stdin.resume();

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    readline.emitKeypressEvents(process.stdin);

    // Initial render
    render();

    // Set ready flag after a short delay to ignore any buffered input
    setTimeout(() => {
      isReady = true;
    }, 200);

    const cleanup = () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeAllListeners('keypress');
    };

    const keyPressHandler = (str: any, key: any) => {
      if (!key || !isReady) return;

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'escape') {
        cleanup();
        resolve(false);
        return;
      }

      if (key.name === 'up' || key.name === 'down') {
        selectedOption = selectedOption === 0 ? 1 : 0;
        render();
      } else if (key.name === 'return') {
        cleanup();
        resolve(selectedOption === 0);
      }
    };

    process.stdin.on('keypress', keyPressHandler);
  });

  if (!confirmed) {
    console.log(chalk.yellow('\n\n❌ Upload cancelled.\n'));
    process.exit(0);
  }

  // Step 5: Upload the conversation
  console.log('\n'); // Clear confirmation and add space
  const uploadSpinner = ora('Uploading conversation...').start();

  try {
    const response = await apiClient.uploadConversation(content);

    uploadSpinner.succeed('Upload successful!');

    console.log(chalk.green('\n✅ Conversation uploaded successfully!\n'));
    console.log(chalk.bold('Share URL:'), chalk.cyan(apiClient.getShareUrl(response.id)));
    console.log(chalk.gray(`\nConversation ID: ${response.id}`));

  } catch (error) {
    uploadSpinner.fail('Upload failed');
    console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));

    if (error instanceof Error && error.message.includes('No response from server')) {
      console.log(chalk.yellow('\nMake sure the runlog server is running:'));
      console.log(chalk.gray('  cd api && rails server'));
    }

    process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});