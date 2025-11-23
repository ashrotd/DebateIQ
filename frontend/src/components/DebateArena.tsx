import { useState, useRef, useEffect } from "react";
import { DebateMessage } from "../types";
import { apiService } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface DebateArenaProps {
  sessionId: string;
  topic: string;
  participants: string[];
  onBack: () => void;
}

export default function DebateArena({ sessionId, topic, participants, onBack }: DebateArenaProps) {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Play audio for a message
  const playAudio = (audioUrl: string, messageId: string) => {
    if (!voiceEnabled) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`${API_BASE_URL}${audioUrl}`);
    audioRef.current = audio;
    setCurrentlyPlaying(messageId);

    audio.play().catch((err) => {
      console.error("Error playing audio:", err);
      setCurrentlyPlaying(null);
    });

    audio.onended = () => {
      setCurrentlyPlaying(null);
      audioRef.current = null;
    };
  };

  // Stop audio playback
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setCurrentlyPlaying(null);
    }
  };

  // Auto-play audio for new AI messages
  useEffect(() => {
    if (voiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'participant' && lastMessage.audio_url && !currentlyPlaying) {
        playAudio(lastMessage.audio_url, lastMessage.id);
      }
    }
  }, [messages, voiceEnabled]);

  // Handler for sending user messages
  const handleSendMessage = async () => {
    if (!userInput.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    setError(null);

    try {
      const response = await apiService.sendUserMessage(sessionId, userInput.trim());

      // Add user message to display
      const userMessage: DebateMessage = {
        id: `user-${Date.now()}`,
        session_id: sessionId,
        speaker_id: "user",
        speaker_name: "You",
        role: "user",
        message_type: "argument",
        content: response.user_message.content,
        timestamp: response.user_message.timestamp,
        turn_number: messages.length + 1,
      };

      // Add AI response to display
      const aiMessage: DebateMessage = {
        id: response.ai_response.id,
        session_id: sessionId,
        speaker_id: participants[0] || "agent",
        speaker_name: response.ai_response.speaker_name,
        role: "participant",
        message_type: "argument",
        content: response.ai_response.content,
        timestamp: response.ai_response.timestamp,
        turn_number: messages.length + 2,
      };

      setMessages((prev: DebateMessage[]) => [...prev, userMessage, aiMessage]);
      setUserInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle Enter key press in input
  const handleKeyPress = (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Start debate streaming when component mounts (optional for auto-start)
  useEffect(() => {
    // Don't auto-start for user-interactive debates
    // Users will send their first message to start the conversation
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [sessionId]);

  const getSpeakerAvatar = (speakerId: string) => {
    if (speakerId === 'moderator') {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-white shadow-lg">
          M
        </div>
      );
    }

    if (speakerId === 'user') {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg">
          U
        </div>
      );
    }

    // For historical figures, try to load their image
    const imageMap: { [key: string]: string } = {
      'lincoln': 'abraham.jpg',
      'tesla': 'nicola.jpg',
      'hitler': 'hitler.jpg',
    };

    const imageName = imageMap[speakerId];
    if (imageName) {
      try {
        return (
          <img
            src={new URL(`../assets/figures/${imageName}`, import.meta.url).href}
            className="w-10 h-10 rounded-full object-cover border-2 border-purple-500 shadow-lg"
            alt={speakerId}
          />
        );
      } catch {
        return (
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
            {speakerId[0].toUpperCase()}
          </div>
        );
      }
    }

    return (
      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
        {speakerId[0].toUpperCase()}
      </div>
    );
  };

  const getMessageStyle = (role: string) => {
    if (role === 'moderator') {
      return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30';
    }
    return 'bg-slate-800/80 border border-purple-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white p-6">

      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-6">
        <button
          className="mb-4 px-4 py-2 bg-slate-800/50 border border-purple-500/30 rounded-lg hover:bg-slate-700/50 transition-all"
          onClick={onBack}
        >
          ← Back to Selection
        </button>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {topic}
            </h1>
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled) stopAudio();
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                voiceEnabled
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Participants:</span>
            {participants.map((p, i) => (
              <span key={p} className="text-purple-300">
                {p}{i < participants.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="max-w-5xl mx-auto mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-red-300">Error: {error}</p>
        </div>
      )}

      {/* MESSAGES BOX */}
      <div className="max-w-5xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 h-[65vh] overflow-y-auto space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>Waiting for debate to start...</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-4 animate-fadeIn"
          >
            {/* AVATAR */}
            {getSpeakerAvatar(msg.speaker_id)}

            {/* MESSAGE CONTENT */}
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-purple-300">{msg.speaker_name}</span>
                <span className="text-xs text-slate-500">
                  {msg.message_type} · Turn {msg.turn_number}
                </span>
                {msg.audio_url && msg.role === 'participant' && (
                  <button
                    onClick={() => {
                      if (currentlyPlaying === msg.id) {
                        stopAudio();
                      } else {
                        playAudio(msg.audio_url!, msg.id);
                      }
                    }}
                    className="text-xs px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded transition-all"
                  >
                    {currentlyPlaying === msg.id ? '⏸️ Stop' : '▶️ Play Voice'}
                  </button>
                )}
              </div>
              <div className={`rounded-xl px-4 py-3 ${getMessageStyle(msg.role)}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}

        {isSendingMessage && (
          <div className="flex items-center gap-3 text-purple-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">Waiting for AI response...</span>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* MESSAGE INPUT BOX */}
      <div className="max-w-5xl mx-auto mt-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4">
          <div className="flex gap-3">
            <textarea
              value={userInput}
              onChange={(e: { target: { value: string } }) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your argument here... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/30"
              rows={3}
              disabled={isSendingMessage}
            />
            <button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isSendingMessage}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/30 self-end"
            >
              {isSendingMessage ? "Sending..." : "Send"}
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Debating with: <span className="text-purple-300">{participants.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}</span>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="max-w-5xl mx-auto mt-4 flex items-center justify-between text-sm text-slate-400">
        <div>
          Messages: {messages.length}
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${isSendingMessage ? 'text-yellow-400' : 'text-green-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isSendingMessage ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
            {isSendingMessage ? 'Sending' : 'Ready'}
          </div>
        </div>
      </div>
    </div>
  );
}
