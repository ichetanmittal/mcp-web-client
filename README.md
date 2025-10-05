# MCP Web Client

A modern web-based client for Model Context Protocol (MCP) servers, built with React, Vite, and Socket.IO. Features a Claude Desktop-inspired UI.

## Architecture

```
Browser (React/Vite)
    ↓ WebSocket (Socket.IO)
Backend Server (Express + Socket.IO)
    ↓ MCP SDK
MCP Server (stdio)
```

## Features

- 💬 Real-time chat interface
- 🔧 Automatic tool execution via Claude AI
- 📊 Live tool status display
- 🎨 Modern, dark-themed UI (GitHub-inspired)
- ⚡ Fast and responsive
- 🔄 Conversation history management

## Project Structure

```
mcp-web-client/
├── src/
│   ├── App.tsx              # Main React component
│   ├── App.css              # Styles
│   └── main.tsx             # Entry point
├── server/
│   ├── index.ts             # Express + Socket.IO server
│   ├── client/
│   │   └── MCPClient.ts     # MCP client wrapper
│   └── llm/
│       └── anthropic.ts     # Claude AI integration
├── .env
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Configuration

Create `.env` file:

```env
ANTHROPIC_API_KEY=your_api_key_here
MCP_SERVER_COMMAND=node
MCP_SERVER_ARGS=../mcp-server/build/index.js
PORT=3001
```

## Usage

### Run Development Mode

Run both frontend and backend simultaneously:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Terminal 1: Frontend (Vite)
npm run dev

# Terminal 2: Backend (Express + Socket.IO)
npm run server
```

### Access the App

Open http://localhost:5173 in your browser

## How It Works

1. **Frontend** (React):
   - Connects to backend via Socket.IO
   - Sends user messages
   - Displays AI responses and tool calls
   - Shows available MCP tools in sidebar

2. **Backend** (Express + Socket.IO):
   - Receives messages from frontend
   - Connects to MCP server via stdio
   - Sends messages to Claude AI with available tools
   - Executes tool calls automatically
   - Returns responses to frontend

3. **MCP Server**:
   - Provides tools (add, echo, timestamp, etc.)
   - Executes tool requests from backend

## Features in Detail

### Chat Interface
- Real-time message streaming
- User and assistant message differentiation
- System notifications
- Loading states

### Tool Execution
- Automatic tool discovery from MCP server
- Claude AI decides when to use tools
- Visual feedback for tool calls
- Tool arguments display

### Sidebar
- Connection status indicator
- List of available tools
- Tool descriptions
- Clear conversation button

## Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **Socket.IO Client** - Real-time communication
- **TypeScript** - Type safety

### Backend
- **Express** - Web server
- **Socket.IO** - WebSocket server
- **MCP SDK** - MCP protocol client
- **Anthropic SDK** - Claude AI integration

## API Events

### Client → Server
- `message`: Send user message
- `get-tools`: Request available tools
- `clear`: Clear conversation history

### Server → Client
- `tools`: List of available tools
- `user-message`: Echo of user message
- `assistant-message`: AI response with tool calls
- `error`: Error messages
- `cleared`: Conversation cleared confirmation

## Production Deployment

### Build Frontend
```bash
npm run build
```

### Deploy Options

1. **All-in-one** (Vercel/Railway):
   - Deploy server code
   - Serve built frontend from `/dist`

2. **Separate** (Netlify + Railway):
   - Frontend: Deploy to Netlify
   - Backend: Deploy to Railway/Render
   - Update Socket.IO URL in frontend

3. **Docker**:
   ```dockerfile
   FROM node:20
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   CMD ["node", "server/index.ts"]
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | Required |
| `MCP_SERVER_COMMAND` | MCP server command | `node` |
| `MCP_SERVER_ARGS` | MCP server arguments | `../mcp-server/build/index.js` |
| `PORT` | Backend port | `3001` |

## Troubleshooting

### "Failed to connect to MCP server"
- Ensure MCP server is built: `cd ../mcp-server && npm run build`
- Check `MCP_SERVER_ARGS` path in `.env`

### "Connection refused" on frontend
- Ensure backend is running: `npm run server`
- Check port 3001 is not in use

### CORS errors
- Frontend URL must match Socket.IO CORS config in `server/index.ts`

## License

MIT
