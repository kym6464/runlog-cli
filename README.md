# runlog CLI

[![npm version](https://badge.fury.io/js/runlog.svg)](https://www.npmjs.com/package/runlog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Share your Claude Code conversations with a single command. Upload and get a shareable link instantly.

## Features

- 📤 **One-command upload** - Share conversations instantly
- 🔍 **Interactive selection** - Browse and preview conversations before uploading
- 🎯 **Project-aware** - Automatically detects conversations from your current directory
- 🔒 **Privacy-focused** - Removes base64 images before upload
- ⚡ **Fast & lightweight** - Minimal dependencies, quick uploads

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

# Select a conversation and upload
# Get your shareable link: https://runlog.io/c/generated-uuid-here
```

## Usage

### Basic Usage

Run `runlog` in any directory containing Claude Code conversations:

```bash
runlog
```

The tool automatically detects conversations from your current project directory.

### Interactive Interface

Navigate conversations with an intuitive TUI:

#### List View
- **↑↓** - Navigate conversations
- **→** - Preview conversation
- **Enter** - Upload selected conversation
- **/** - Search conversations
- **s** - Change sort field
- **o** - Toggle sort order
- **Esc** - Exit

#### Preview Mode
- **↑↓** - Scroll through messages
- **←** - Return to list
- **Enter** - Upload conversation
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
3. **Preview** conversations before uploading
4. **Sanitizes** data by removing base64 images
5. **Uploads** to runlog.io and returns a shareable link

## Requirements

- Node.js >= 16.0.0
- Claude Code conversations in `~/.claude/projects/`

## Configuration

### Environment Variables

- `RUNLOG_API_ENDPOINT` - Custom API endpoint (default: `https://api.runlog.io`)
- `CLAUDE_DIR` - Claude projects directory (default: `~/.claude/projects`)

Example:
```bash
RUNLOG_API_ENDPOINT=https://custom.api.com runlog
```

## Troubleshooting

### "No conversations found"
Make sure you:
- Have Claude Code conversations in `~/.claude/projects/`
- Are running the command in a project directory
- Have `.jsonl` files in the conversations directory

### Upload Errors
The tool validates conversations before upload:
- **Max file size**: 10MB
- **Max messages**: 5000
- **Images**: Automatically removed (base64 data stripped)

### Connection Issues
- Check your internet connection
- Verify the API endpoint is accessible
- Try again later if the service is temporarily unavailable

## Privacy & Security

- **Local processing**: Conversations are processed locally before upload
- **Image removal**: Base64 images are automatically stripped
- **Project isolation**: Only shows conversations from current directory
- **Secure upload**: HTTPS encryption for all uploads

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

## Links

- [runlog.io](https://runlog.io) - View shared conversations
- [GitHub Repository](https://github.com/TensorPoet/runlog-cli)
- [npm Package](https://www.npmjs.com/package/runlog)
- [Report Issues](https://github.com/TensorPoet/runlog-cli/issues)

## License

MIT © [runlog](https://runlog.io)