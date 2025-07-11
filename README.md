# runlog CLI

[![npm version](https://badge.fury.io/js/runlog.svg)](https://www.npmjs.com/package/runlog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Export your Claude Code conversations to beautiful HTML files with a single command. Create self-contained, shareable HTML files for documentation, sharing, or archival purposes.

## Features

- 📁 **HTML Export** - Convert conversations to beautiful, self-contained HTML files
- 🔍 **Interactive selection** - Browse and preview conversations before exporting
- 🎯 **Project-aware** - Automatically detects conversations from your current directory
- 🎨 **Beautiful formatting** - Syntax highlighting, responsive design, and clean layout
- 📱 **Mobile-friendly** - HTML files work perfectly on any device
- 🔒 **Privacy-focused** - All processing happens locally, no data leaves your machine
- ⚡ **Fast & lightweight** - Minimal dependencies, instant exports

## Installation

```bash
npm install -g runlog
```

Or use without installing:

```bash
npx runlog
```

## Quick Start

```bash
# In your project directory
runlog

# Select a conversation and export to HTML
# Opens HTML file in your current directory
```

## Usage

### Basic Usage

Run `runlog` in any directory containing Claude Code conversations:

```bash
# Export with automatic filename
runlog

# Export with custom filename
runlog --output my-conversation.html
runlog -o my-conversation.html
```

The tool automatically detects conversations from your current project directory.

### Interactive Interface

Navigate conversations with an intuitive TUI:

#### List View
- **↑↓** - Navigate conversations
- **→** - Preview conversation
- **Enter** - Export selected conversation
- **/** - Search conversations
- **s** - Change sort field
- **o** - Toggle sort order
- **Esc** - Exit

#### Preview Mode
- **↑↓** - Scroll through messages
- **←** - Return to list
- **Enter** - Export conversation
- **Esc** - Exit

### Search and Sort

Search conversations by typing `/` in the list view. Sort by:
- Last message time (default)
- Message count
- Conversation ID
- Active duration

## How It Works

1. **Detects** Claude Code conversations in your current directory
2. **Lists** all conversations with metadata (time, messages, duration)
3. **Preview** conversations before exporting
4. **Processes** messages with syntax highlighting and formatting
5. **Exports** to a beautiful, self-contained HTML file
6. **Removes** base64 images for cleaner output

## Requirements

- Node.js >= 16.0.0
- Claude Code conversations in `~/.claude/projects/`

## Configuration

### Environment Variables

- `CLAUDE_DIR` - Claude projects directory (default: `~/.claude/projects`)

## Troubleshooting

### "No conversations found"
Make sure you:
- Have Claude Code conversations in `~/.claude/projects/`
- Are running the command in a project directory
- Have `.jsonl` files in the conversations directory

### Export Issues
- **Large conversations**: Very large conversations may take a moment to process
- **Images**: Base64 images are automatically replaced with placeholders
- **File permissions**: Ensure you have write permissions in the output directory

## Privacy & Security

- **Completely local**: All processing happens on your machine - no data leaves your computer
- **No network requests**: Tool works entirely offline
- **Image removal**: Base64 images are automatically replaced with placeholders
- **Project isolation**: Only shows conversations from your current directory
- **Self-contained output**: HTML files include all styling and scripts inline

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/TensorPoet/runlog-cli.git
cd runlog-cli/tool

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run in development
npm run dev
```

## Output Features

- **Responsive design**: HTML files work perfectly on desktop and mobile
- **Syntax highlighting**: Code blocks are beautifully highlighted
- **Copy buttons**: Click to copy code blocks to clipboard
- **Print-friendly**: Clean printing layouts
- **Self-contained**: No external dependencies, works offline

## Links

- [GitHub Repository](https://github.com/TensorPoet/runlog-cli)
- [npm Package](https://www.npmjs.com/package/runlog)
- [Report Issues](https://github.com/TensorPoet/runlog-cli/issues)

## License

MIT