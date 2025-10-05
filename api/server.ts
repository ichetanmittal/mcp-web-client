import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { MCPClient } from '../server/client/MCPClient.js';
import { AnthropicLLM } from '../server/llm/anthropic.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Store conversation history per socket
const conversations = new Map<string, any[]>();

// Initialize MCP client with remote server URL
const mcpClient = new MCPClient({
  type: 'http',
  url: process.env.MCP_SERVER_URL || 'https://blockza.fastmcp.app/mcp',
});

// Initialize LLM
const llm = new AnthropicLLM(process.env.ANTHROPIC_API_KEY!);

// Connect to MCP server
let isConnected = false;
(async () => {
  try {
    await mcpClient.connect();
    isConnected = true;
    console.log('✓ Connected to MCP server');
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
  }
})();

// Health check endpoint
app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',
    mcpServer: process.env.MCP_SERVER_URL || 'https://blockza.fastmcp.app/mcp',
    connected: isConnected
  });
});

// Get tools endpoint
app.get('/api/tools', async (_, res) => {
  try {
    const tools = await mcpClient.listTools();
    res.json({ tools: tools.tools });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    const history = conversations.get(sessionId) || [];

    history.push({
      role: 'user',
      content: message,
    });

    const { response, toolCalls } = await llm.processQuery(
      message,
      [...history],
      mcpClient
    );

    history.push({
      role: 'assistant',
      content: response,
    });

    conversations.set(sessionId, history);

    res.json({
      message: response,
      toolCalls,
    });
  } catch (error: any) {
    console.error('Error processing message:', error);
    res.status(500).json({
      error: error.message || 'Failed to process message',
    });
  }
});

// Clear conversation endpoint
app.post('/api/clear', (req, res) => {
  const { sessionId } = req.body;
  conversations.set(sessionId, []);
  res.json({ success: true });
});

export default app;
