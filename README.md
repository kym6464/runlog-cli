# runlog CLI

Command-line tool for uploading Claude Code conversations to runlog.io.

## Installation

### From source (development)

```bash
# Clone the repository
git clone <repository-url>
cd runlog/tool

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

### Local installation (without publishing to npm)

```bash
cd runlog/tool
npm install
npm run build

# Run directly
node dist/index.js

# Or use npx from the project root
npx ./tool
```

## Usage

Simply run the command to see your Claude Code conversations and upload one:

```bash
runlog
```

Or if not linked globally:

```bash
npx ./tool
```

The tool will:
1. List Claude Code conversations for the current project directory only
2. Sort conversations by newest first (most recent at the top)
3. Show the project name, last message time, and message count
4. Let you navigate and preview conversations:
   - **List Mode:**
     - **↑↓** - Navigate through conversations
     - **→** - Enter preview mode
     - **Enter** - Select conversation for upload
     - **Esc** - Cancel and exit
   - **Preview Mode:**
     - **↑** - Scroll to newer messages
     - **↓** - Scroll to older messages
     - **←** - Return to list
     - **Enter** - Select conversation for upload
     - **Esc** - Cancel and exit

     Preview shows messages from oldest to newest and uses all available terminal space.
5. Show upload confirmation screen with conversation details
   - **↑↓** - Navigate between options (Yes, upload / No, cancel)
   - **Enter** - Confirm selection
   - **Esc** - Cancel upload
   - Default selection is "Yes, upload"
6. Pre-process the conversation (remove any base64 image data)
7. Upload the selected conversation to the server
8. Display a shareable link (e.g., https://runlog.io/c/{id})

**Note:** The tool automatically removes any base64 image data before uploading, as the server does not accept conversations containing images.

Note: The tool only shows conversations from the current working directory. For example, if you run it from `/Users/you/myproject`, it will only show conversations from that project.

## Configuration

### Environment Variables

- `RUNLOG_API_ENDPOINT`: API server URL (default: `https://api.runlog.io`)
- `CLAUDE_DIR`: Claude projects directory (default: `~/.claude/projects`)

For local development:
```bash
RUNLOG_API_ENDPOINT=http://localhost:3000 runlog
```

## Development

### Run in development mode
```bash
npm run dev
```

### Run tests
```bash
npm test
```

### Watch tests
```bash
npm run test:watch
```

### Build
```bash
npm run build
```

## Requirements

- Node.js >= 16.0.0
- Claude Code conversations in `~/.claude/projects/`
- runlog API server running (locally or remotely)

## Troubleshooting

### "No conversations found"
- Make sure you have Claude Code conversations in `~/.claude/projects/`
- Check that the directory exists and contains `.jsonl` files

### "No response from server"
- Ensure the runlog API server is running
- Check the API endpoint configuration
- For local development: `cd api && rails server`

### "Server error"
- Check the server logs for more details
- Ensure the conversation file is valid JSONL format
- Check if the conversation exceeds limits:
  - Maximum size: 10MB
  - Maximum messages: 5000
  - Images are not allowed (automatically removed by the tool)

## License

MIT