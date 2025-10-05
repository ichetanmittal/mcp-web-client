import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [tools, setTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');

    newSocket.on('connect', () => {
      setIsConnected(true);
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: '✓ Connected to MCP server' },
      ]);
      newSocket.emit('get-tools');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: '✗ Disconnected from server' },
      ]);
    });

    newSocket.on('tools', (toolsList: any[]) => {
      setTools(toolsList);
    });

    newSocket.on('user-message', (data: { message: string }) => {
      setMessages((prev) => [...prev, { role: 'user', content: data.message }]);
    });

    newSocket.on('assistant-message', (data: { message: string; toolCalls: any[] }) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, toolCalls: data.toolCalls },
      ]);
      setIsLoading(false);
    });

    newSocket.on('error', (data: { message: string }) => {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `Error: ${data.message}` },
      ]);
      setIsLoading(false);
    });

    newSocket.on('cleared', () => {
      setMessages([{ role: 'system', content: '✓ Conversation cleared' }]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !isConnected) return;

    setIsLoading(true);
    socket.emit('message', { message: input });
    setInput('');
  };

  const clearConversation = () => {
    if (socket) {
      socket.emit('clear');
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
