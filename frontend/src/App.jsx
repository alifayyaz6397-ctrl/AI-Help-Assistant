import { useState, useRef, useEffect } from "react";
import "./App.css";
export const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function askQuestion() {
    if (!query.trim() || loading) return;

    const currentQuery = query.trim();

    
    const historyToSend = [
      ...messages
        .filter(
          (msg) =>
            !msg.isError &&
            msg.content !== "Thinking..."
        )
        .map(({ role, content }) => ({ role, content })),
      { role: "user", content: currentQuery },
    ];

    setQuery("");
    setLoading(true);

    // Update UI immediately
    setMessages([
      ...historyToSend,
      { role: "assistant", content: "Thinking..." },
    ]);

    try {
      const response = await 
        fetch(`${API_URL}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: currentQuery,
          history: historyToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: data.answer,
        };
        return updated;
      });
    } catch (error) {
      console.error("Error fetching answer:", error);

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          isError: true,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  }

  return (
    <div className="page-root">
      <header className="page-header">
        <h1>UET Lahore Help Assistant</h1>
        <p>
          Welcome to the official student help assistant for the University
          of Engineering and Technology (UET) Lahore. Use the chat widget in
          the corner to ask questions about admissions, departments,
          academic programs, campus facilities, and other UET-related
          queries — available anytime, right on this page.
        </p>
      </header>

      <div className="widget-root">
        {!isOpen && (
          <button
            className="chat-bubble"
            onClick={() => setIsOpen(true)}
            aria-label="Open help assistant"
          >
            💬
          </button>
        )}

        {isOpen && (
          <div className="chat-panel">
            <div className="chat-header">
              <span>Help Assistant</span>

              <button
                className="close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <p className="empty-state">
                  Ask me anything about this site 👋
                </p>
              )}

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message-row ${
                    msg.role === "user" ? "user-row" : "assistant-row"
                  }`}
                >
                  <div
                    className={`bubble ${
                      msg.role === "user"
                        ? "user-bubble"
                        : "assistant-bubble"
                    } ${msg.isError ? "error-bubble" : ""}`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <input
                ref={inputRef}
                type="text"
                value={query}
                placeholder="Type your question..."
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />

              <button
                onClick={askQuestion}
                disabled={loading || !query.trim()}
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;