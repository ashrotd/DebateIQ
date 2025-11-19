import { useState, useRef, useEffect } from "react";
import { Figure } from "../types";

interface DebateArenaProps {
  figure: Figure;
  onBack: () => void;
}

interface Message {
  id: string;
  role: "user" | "figure" | "moderator" | "judge";
  content: string;
  timestamp: Date;
}

export default function DebateArena({ figure, onBack }: DebateArenaProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "moderator",
      content: `Welcome to the debate arena! Today's debate will be between you and ${figure.name}. State your opening argument when ready.`,
      timestamp: new Date(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "figure",
        content: `As ${figure.name}, I must respond to your argument with historical perspective...`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      
      {/* BACK BUTTON */}
      <button
        className="mb-6 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
        onClick={onBack}
      >
        ← Back
      </button>

      {/* TITLE */}
      <h1 className="text-3xl font-bold mb-6 text-center">
        Debate with {figure.name}
      </h1>

      {/* MESSAGES BOX */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-6 h-[70vh] overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "justify-end" : ""
            }`}
          >
            {/* FIGURE IMAGE ONLY ON FIGURE MESSAGES */}
            {msg.role === "figure" && (
              <img
                src={
                  new URL(`../assets/figures/${figure.image}`, import.meta.url)
                    .href
                }
                className="w-10 h-10 rounded-full object-cover border border-purple-500 shadow-lg"
              />
            )}

            <div
              className={`max-w-[70%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : msg.role === "figure"
                  ? "bg-slate-800 border border-purple-500"
                  : "bg-slate-700"
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>

            {/* USER AVATAR (OPTIONAL) */}
            {msg.role === "user" && (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
                U
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="text-slate-400 italic text-sm">Typing...</div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* INPUT */}
      <div className="mt-4 flex gap-3">
        <input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
          placeholder="Write your argument..."
        />
        <button
          onClick={handleSendMessage}
          className="px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
