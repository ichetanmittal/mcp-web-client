import { useState, useEffect, useRef } from 'react';
import './App.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
}

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
const SESSION_ID = Math.random().toString(36).substring(7);

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [tools, setTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check server health and get tools
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => {
        setIsConnected(data.connected);
        setMessages([{ role: 'system', content: `✓ Connected to MCP server: ${data.mcpServer}` }]);
      })
      .catch(() => {
        setMessages([{ role: 'system', content: '✗ Failed to connect to server' }]);
      });

    fetch(`${API_BASE}/tools`)
      .then(res => res.json())
      .then(data => setTools(data.tools || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId: SESSION_ID })
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'system', content: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.message, toolCalls: data.toolCalls }
        ]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      await fetch(`${API_BASE}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: SESSION_ID })
      });
      setMessages([{ role: 'system', content: '✓ Conversation cleared' }]);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>MCP Client</h2>
          <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● Connected' : '● Disconnected'}
          </div>
        </div>

        <div className="tools-section">
          <h3>Available Tools</h3>
          <div className="tools-list">
            {tools.length > 0 ? (
              tools.map((tool) => (
                <div key={tool.name} className="tool-item">
                  <div className="tool-name">{tool.name}</div>
                  <div className="tool-description">{tool.description}</div>
                </div>
              ))
            ) : (
              <div className="no-tools">No tools available</div>
            )}
          </div>
        </div>

        <button onClick={clearConversation} className="clear-btn">
          Clear Conversation
        </button>
      </div>

      <div className="main-content">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome">
              <h1>Welcome to MCP Web Client</h1>
              <p>Start a conversation by typing a message below</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.role}`}>
              <div className="message-role">
                {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Assistant' : 'System'}
              </div>
              <div className="message-content">{msg.content}</div>
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="tool-calls">
                  {msg.toolCalls.map((call, i) => (
                    <div key={i} className="tool-call">
                      🔧 Used tool: <strong>{call.name}</strong>
                      <pre>{JSON.stringify(call.args, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="message message-assistant">
              <div className="message-role">Assistant</div>
              <div className="message-content loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={!isConnected || isLoading}
            className="message-input"
          />
          <button
            type="submit"
            disabled={!isConnected || isLoading || !input.trim()}
            className="send-btn"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
