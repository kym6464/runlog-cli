# Project Plan: Convert `runlog` to a Serverless HTML Exporter

The goal is to fork the `runlog-cli` repository and modify it into a standalone command-line tool that converts Claude conversations into shareable, single-file HTML documents, removing all server-side dependencies.

### Phase 1: Decoupling from the Server

This phase focuses on removing all code related to the remote API, making the tool fully offline.

1. **Delete API-Related Files:**
   - Remove `src/api.ts` and its corresponding test file `src/api.test.ts`. This is the core module for server communication.
2. **Remove API Client from `index.ts`:**
   - In the main entry point (`src/index.ts`), delete all instantiations and uses of the `ApiClient`.
   - Remove the `deleteConversation` function and its associated command-line parsing logic (`del` command).
   - Remove all code related to uploading, including spinners, confirmation prompts, and success messages that reference a shareable URL.
3. **Clean Up Configuration:**
   - In `src/config.ts`, remove the `apiEndpoint` and `clientId` logic. The tool will no longer need to identify itself to a server. The configuration can be simplified to only manage the `claudeDir`.
4. **Update Dependencies:**
   - In `package.json`, remove the `axios` dependency, as it is only used for making HTTP requests.

### Phase 2: Implementing HTML Generation

This is the core feature addition. We will add a new module responsible for creating the HTML file.

1. **Create an HTML Generation Module:**
   - Create a new file, `src/html-generator.ts`.
   - This module will contain a function, e.g., `generateHtml(conversation: ConversationMetadata, messages: Message[]): string`.
   - This function will take the conversation metadata and the full list of messages and return a complete HTML string.
2. **Design the HTML Output:**
   - The generated HTML should be a self-contained file. All necessary CSS and any minor JavaScript (e.g., for code block copying) should be embedded within the `<style>` and `<script>` tags in the HTML's `<head>`.
   - **Structure:**
     - A header section with the conversation summary, date, and message count.
     - A main content area with chat bubbles for user and assistant messages.
     - Use a clean, modern design that mimics a standard chat interface.
3. **Handle Message Content:**
   - The generator must correctly parse and render different message types (user, assistant, tool use).
   - It needs to handle multi-part messages, especially rendering text and code blocks correctly.
   - It should include a placeholder for sanitized images, like `[Image Content Removed]`.
4. **Add Syntax Highlighting (Recommended):**
   - To improve readability, integrate a lightweight, client-side syntax highlighting library like `highlight.js`. The library's CSS and JS can be embedded directly into the generated HTML file from a CDN link or local string.

### Phase 3: Integrating into the CLI Workflow

This phase connects the new HTML generator to the existing user interface.

1. **Modify the Main Workflow (`index.ts`):**

   - After the user selects a conversation using the `InteractiveSelector`, the workflow changes from "upload" to "export".
   - Instead of calling `apiClient.uploadConversation()`, the tool will:
     1. Parse the full content of the selected conversation file using the `ConversationParser`.
     2. Pass the data to the new `html-generator` module.
     3. Save the returned HTML string to a new file (e.g., `conversation-summary.html`) in the current directory or a user-specified output directory.

2. **Update User Prompts and Feedback:**

   - Change the confirmation prompt from "Do you want to proceed with the upload?" to "Do you want to export this conversation to HTML?".

   - The final success message should be updated to something like:

     > ✅ **Success!** Conversation exported to: `[path/to/your/file.html]`

3. **Update Command-Line Interface and `README.md`:**

   - Update the `README.md` and any help text to reflect the new purpose of the tool. Remove all references to `runlog.io`, uploading, and shareable links.
   - Consider adding a new command-line option to specify the output file name, e.g., `runlog --output my-convo.html`.

### High-Level Task List:

- [ ] **Code Removal:** Delete `api.ts`, `api.test.ts`, and `axios`.
- [ ] **Refactor `index.ts`:** Remove upload/delete logic.
- [ ] **Refactor `config.ts`:** Simplify to just `claudeDir`.
- [ ] **Create `html-generator.ts`:** Build the core HTML generation logic.
- [ ] **Design HTML Template:** Create a clean, self-contained HTML/CSS structure.
- [ ] **Integrate Generation:** Call the HTML generator after conversation selection.
- [ ] **File I/O:** Save the generated HTML string to a local file.
- [ ] **Update UI/Text:** Change prompts and success messages.
- [ ] **Documentation:** Update `README.md` to reflect the new functionality.