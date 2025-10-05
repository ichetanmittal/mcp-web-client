import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { MCPClient } from './client/MCPClient.js';
import { AnthropicLLM } from './llm/anthropic.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Store conversation history per socket
const conversations = new Map<string, any[]>();

// Initialize MCP client with remote server URL
const mcpClient = new MCPClient({
  type: 'http',
  url: process.env.MCP_SERVER_URL || 'https://blockza.fastmcp.app/mcp',
});

// Initialize LLM
const llm = new AnthropicLLM(process.env.ANTHROPIC_API_KEY!);

// Connect to MCP server on startup
(async () => {
  try {
    await mcpClient.connect();
    console.log('✓ Connected to MCP server');
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
  }
})();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  conversations.set(socket.id, []);

  // Send available tools on connection
  socket.on('get-tools', async () => {
    try {
      const tools = await mcpClient.listTools();
      socket.emit('tools', tools.tools);
    } catch (error) {
      socket.emit('error', { message: 'Failed to get tools' });
    }
  });

  // Handle chat messages
  socket.on('message', async (data: { message: string }) => {
    try {
      const history = conversations.get(socket.id) || [];

      // Add user message to history
      history.push({
        role: 'user',
        content: data.message,
      });

      // Emit user message confirmation
      socket.emit('user-message', { message: data.message });

      // Process with LLM and MCP
      const { response, toolCalls } = await llm.processQuery(
        data.message,
        [...history],
        mcpClient
      );

      // Add assistant response to history
      history.push({
        role: 'assistant',
        content: response,
      });

      conversations.set(socket.id, history);

      // Send response back
      socket.emit('assistant-message', {
        message: response,
        toolCalls,
      });
    } catch (error: any) {
      console.error('Error processing message:', error);
      socket.emit('error', {
        message: error.message || 'Failed to process message',
      });
    }
  });

  // Clear conversation
  socket.on('clear', () => {
    conversations.set(socket.id, []);
    socket.emit('cleared');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    conversations.delete(socket.id);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mcpServer: process.env.MCP_SERVER_URL || 'https://blockza.fastmcp.app/mcp',
    connected: mcpClient.connected
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Cleanup on exit
process.on('SIGTERM', async () => {
  await mcpClient.disconnect();
  process.exit(0);
});
