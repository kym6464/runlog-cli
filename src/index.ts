#!/usr/bin/env node

import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConversationParser } from './parser.js';
import { getConfig } from './config.js';
import { InteractiveSelector } from './interactive-selector.js';
import { ConversationMetadata } from './types.js';
import { generateHtml, parseJsonlMessages } from './html-generator.js';

function showHelp() {
  console.log(chalk.bold.blue('\n🔧 runlog - Claude Code Conversation Exporter\n'));
  console.log('Usage: runlog [options]\n');
  console.log('Commands:');
  console.log('  runlog              Export a conversation (interactive selection)');
  console.log('  runlog --output filename.html  Export with custom filename');
  console.log('  runlog -o filename.html        Export with custom filename (short)');
  console.log('  runlog --help       Show this help message\n');
  console.log('Examples:');
  console.log('  runlog                                    # Export current project\'s conversation to HTML');
  console.log('  runlog --output my-conversation.html     # Export with custom filename');
  console.log('  runlog --help                             # Show help\n');
  console.log('Environment Variables:');
  console.log('  CLAUDE_DIR            Claude projects directory (default: ~/.claude/projects)\n');
}


async function exportConversation(customOutputFilename?: string) {
  console.log(chalk.bold.blue('\n🔧 runlog - Claude Code Conversation Exporter\n'));

  const config = getConfig();
  const parser = new ConversationParser(config.claudeDir);
  const currentDir = process.cwd();

  console.log(chalk.gray(`Current directory: ${currentDir}\n`));

  // Step 1: Load conversations
  console.log('Loading conversations for this project...');

  let conversations: ConversationMetadata[];
  try {
    conversations = await parser.getAllConversations();
    console.log(chalk.green(`Found ${conversations.length} conversations`));
  } catch (error) {
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

  // Step 3: Get conversation content
  let content: string;
  try {
    content = await parser.getConversationContent(selectedConversation.filePath);
  } catch (error) {
    console.error(chalk.red(`\nError reading conversation: ${error instanceof Error ? error.message : error}`));
    process.exit(1);
  }

  const sizeInBytes = Buffer.byteLength(content, 'utf8');
  const sizeInMB = sizeInBytes / (1024 * 1024);

  console.log(chalk.green('\n✅ Conversation loaded successfully!\n'));
  console.log(chalk.bold('Selected Conversation:'));
  console.log(chalk.white(`  Summary preview: ${selectedConversation.summary}`));
  console.log(chalk.gray(`  Messages: ${selectedConversation.messageCount}`));
  console.log(chalk.gray(`  Size: ${sizeInMB.toFixed(2)} MB`));
  console.log(chalk.gray(`  Last activity: ${selectedConversation.lastMessageTime}`));
  console.log();

  // Step 4: Generate HTML export
  console.log('Generating HTML export...');
  
  try {
    // Parse the JSONL content into Message objects
    const messages = parseJsonlMessages(content);
    
    // Generate HTML content
    const htmlContent = generateHtml(selectedConversation, messages);
    
    // Create output filename
    let filename: string;
    if (customOutputFilename) {
      filename = customOutputFilename;
      // Ensure .html extension
      if (!filename.endsWith('.html')) {
        filename += '.html';
      }
    } else {
      const projectName = selectedConversation.projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      filename = `claude-conversation-${projectName}-${timestamp}.html`;
    }
    const outputPath = path.join(currentDir, filename);
    
    // Write HTML file
    await fs.writeFile(outputPath, htmlContent, 'utf-8');
    
    console.log(chalk.green('\n🎉 HTML export completed successfully!\n'));
    console.log(chalk.bold('Export Details:'));
    console.log(chalk.white(`  File: ${filename}`));
    console.log(chalk.gray(`  Location: ${outputPath}`));
    console.log(chalk.gray(`  Size: ${(Buffer.byteLength(htmlContent, 'utf8') / 1024).toFixed(1)} KB`));
    console.log();
    console.log(chalk.blue('💡 Tip: Open the HTML file in your browser to view the conversation!'));
    
  } catch (error) {
    console.error(chalk.red(`\nError generating HTML export: ${error instanceof Error ? error.message : error}`));
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  if (args.length === 0) {
    // Default: export conversation
    await exportConversation();
  } else if (args[0] === '--help' || args[0] === '-h') {
    showHelp();
  } else if (args[0] === '--output' || args[0] === '-o') {
    if (args.length < 2) {
      console.error(chalk.red('\nError: --output requires a filename\n'));
      showHelp();
      process.exit(1);
    }
    // Export with custom filename
    await exportConversation(args[1]);
  } else {
    console.error(chalk.red(`\nError: Unknown command "${args[0]}"\n`));
    showHelp();
    process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});