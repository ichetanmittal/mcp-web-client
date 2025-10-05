import Anthropic from '@anthropic-ai/sdk';
import { MCPClient } from '../client/MCPClient.js';

export class AnthropicLLM {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async processQuery(
    query: string,
    conversationHistory: any[],
    mcpClient: MCPClient
  ): Promise<{ response: string; toolCalls: any[] }> {
    const toolsResult = await mcpClient.listTools();
    const tools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: tool.inputSchema,
    }));

    const toolCalls: any[] = [];
    let finalResponse = '';
    const maxIterations = 5;

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        tools: tools as any,
        messages: conversationHistory,
      });

      const toolUseBlock = response.content.find((block: any) => block.type === 'tool_use');

      if (!toolUseBlock) {
        const textBlock = response.content.find((block: any) => block.type === 'text');
        finalResponse = textBlock ? (textBlock as any).text : 'No response';
        break;
      }

      const toolName = (toolUseBlock as any).name;
      const toolArgs = (toolUseBlock as any).input;

      toolCalls.push({ name: toolName, args: toolArgs });

      const toolResult = await mcpClient.callTool(toolName, toolArgs);
      const resultText = toolResult.content
        .map((item: any) => (item.type === 'text' ? item.text : ''))
        .join('\n');

      conversationHistory.push({
        role: 'assistant',
        content: response.content,
      });

      conversationHistory.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: (toolUseBlock as any).id,
            content: resultText,
          },
        ],
      });
    }

    return { response: finalResponse, toolCalls };
  }
}
