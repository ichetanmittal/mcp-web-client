import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface HttpServerConfig {
  type: 'http';
  url: string;
}

export type ServerConfig = HttpServerConfig;

export class MCPClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private isConnected = false;

  constructor(private serverConfig: ServerConfig) {}

  async connect(): Promise<void> {
    if (this.isConnected) return;

    this.transport = new StreamableHTTPClientTransport(
      new URL(this.serverConfig.url)
    );

    this.client = new Client(
      { name: 'mcp-web-client', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    await this.client.connect(this.transport);
    this.isConnected = true;
  }

  async listTools() {
    if (!this.client) throw new Error('Not connected');
    return await this.client.listTools();
  }

  async callTool(name: string, args?: Record<string, unknown>) {
    if (!this.client) throw new Error('Not connected');
    const result = await this.client.callTool({ name, arguments: args || {} });
    return result as any;
  }

  async disconnect(): Promise<void> {
    if (this.client) await this.client.close();
    if (this.transport) await this.transport.close();
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
