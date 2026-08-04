
import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  async function askQuestion() {
    if (!query || loading) {
      return;
    }

    const currentQuery = query;
    setQuery("");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: currentQuery },
      { role: "assistant", content: "Thinking..." }
    ]);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: currentQuery ,history: messages})
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: data.answer
        };
        return updated;
      });
    } catch (error) {
      console.error("Error fetching answer:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Something went wrong. Please try again.",
          isError: true
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={askQuestion} disabled={loading}>
        {loading ? "Thinking.. " : "Ask"}
      </button>

      <div>
        {messages.map((msg, index) => (
          <p key={index} style={{ color: msg.isError ? "red" : "black" }}>
            <strong>{msg.role}:</strong> {msg.content}
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;