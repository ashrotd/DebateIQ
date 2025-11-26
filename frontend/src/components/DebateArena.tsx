import { useState, useRef, useEffect } from "react";
import { DebateMessage } from "../types";
import { apiService } from "../services/api";
import { SpeakerWaveIcon, SpeakerXMarkIcon, MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

const API_BASE_URL = "http://localhost:8000";
const MAX_USER_TURNS = 6;

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [userTurnCount, setUserTurnCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user has reached turn limit
  const hasReachedLimit = userTurnCount >= MAX_USER_TURNS;
  const turnsRemaining = MAX_USER_TURNS - userTurnCount;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Play audio for a message
  const playAudio = (audioUrl: string, messageId: string) => {
    if (!voiceEnabled) return;

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

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setCurrentlyPlaying(null);
    }
  };

  useEffect(() => {
    if (voiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'participant' && lastMessage.audio_url && !currentlyPlaying) {
        playAudio(lastMessage.audio_url, lastMessage.id);
      }
    }
  }, [messages, voiceEnabled]);

  // Start voice recording
  const startRecording = async () => {
    if (hasReachedLimit) {
      setError("You have reached the maximum number of turns (6).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Send voice message to backend
  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (hasReachedLimit) {
      setError("You have reached the maximum number of turns (6).");
      return;
    }

    setIsSendingMessage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('session_id', sessionId);

      const response = await fetch(`${API_BASE_URL}/api/v1/debates/${sessionId}/voice-message`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send voice message');
      }

      const data = await response.json();

      // Add user message to display
      const userMessage: DebateMessage = {
        id: `user-${Date.now()}`,
        session_id: sessionId,
        speaker_id: "user",
        speaker_name: "You",
        role: "user",
        message_type: "argument",
        content: data.user_message.content,
        timestamp: data.user_message.timestamp,
        turn_number: messages.length + 1,
        audio_url: undefined,
      };

      // Add AI response to display
      const aiMessage: DebateMessage = {
        id: data.ai_response.id,
        session_id: sessionId,
        speaker_id: participants[0] || "agent",
        speaker_name: data.ai_response.speaker_name,
        role: "participant",
        message_type: "argument",
        content: data.ai_response.content,
        timestamp: data.ai_response.timestamp,
        turn_number: messages.length + 2,
        audio_url: data.ai_response.audio_url,
      };

      setMessages((prev: DebateMessage[]) => [...prev, userMessage, aiMessage]);
      setUserTurnCount(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send voice message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handler for sending text messages
  const handleSendMessage = async () => {
    if (!userInput.trim() || isSendingMessage) return;
    
    if (hasReachedLimit) {
      setError("You have reached the maximum number of turns (6).");
      return;
    }

    setIsSendingMessage(true);
    setError(null);

    try {
      const response = await apiService.sendUserMessage(sessionId, userInput.trim());

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
        audio_url: undefined,
      };

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
        audio_url: response.ai_response.audio_url,
      };

      setMessages((prev: DebateMessage[]) => [...prev, userMessage, aiMessage]);
      setUserInput("");
      setUserTurnCount(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyPress = (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            <div className="flex items-center gap-3">
              {/* Turn Counter */}
              <div className={`px-4 py-2 rounded-lg font-semibold ${
                hasReachedLimit 
                  ? 'bg-red-600/30 border border-red-500/50 text-red-300' 
                  : 'bg-blue-600/30 border border-blue-500/50 text-blue-300'
              }`}>
                Turns: {userTurnCount}/{MAX_USER_TURNS}
              </div>
              
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

      {/* TURN LIMIT WARNING */}
      {hasReachedLimit && (
        <div className="max-w-5xl mx-auto mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
          <p className="text-yellow-300 font-semibold">
            🎯 You've reached the maximum number of turns ({MAX_USER_TURNS}). The debate is complete!
          </p>
        </div>
      )}

      {/* LOW TURNS WARNING */}
      {!hasReachedLimit && turnsRemaining <= 2 && turnsRemaining > 0 && (
        <div className="max-w-5xl mx-auto mb-4 p-4 bg-orange-500/20 border border-orange-500/50 rounded-xl">
          <p className="text-orange-300">
            ⚠️ Only {turnsRemaining} turn{turnsRemaining === 1 ? '' : 's'} remaining!
          </p>
        </div>
      )}

      {/* MESSAGES BOX */}
      <div className="max-w-5xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 h-[65vh] overflow-y-auto space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>Start the debate by typing or recording your first argument...</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-4 animate-fadeIn"
          >
            {getSpeakerAvatar(msg.speaker_id)}

            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-purple-300">{msg.speaker_name}</span>
                <span className="text-xs text-slate-500">
                  {msg.message_type} · Turn {msg.turn_number}
                </span>
                <div className="flex items-center">
                  {msg.audio_url ? (
                    <button
                      onClick={() => {
                        if (currentlyPlaying === msg.id) {
                          stopAudio();
                        } else {
                          playAudio(msg.audio_url!, msg.id);
                        }
                      }}
                      className="p-1 rounded hover:bg-purple-600/30 transition-all"
                    >
                      {currentlyPlaying === msg.id ? (
                        <SpeakerXMarkIcon className="w-5 h-5 text-purple-400" />
                      ) : (
                        <SpeakerWaveIcon className="w-5 h-5 text-purple-400" />
                      )}
                    </button>
                  ) : (
                    <SpeakerXMarkIcon className="w-5 h-5 text-slate-600 opacity-40" />
                  )}
                </div>
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
          {isRecording ? (
            <div className="flex items-center justify-between gap-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-300 font-semibold">Recording...</span>
                <span className="text-slate-400">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <StopIcon className="w-5 h-5" />
                Stop & Send
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <textarea
                value={userInput}
                onChange={(e: { target: { value: string } }) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasReachedLimit ? "Turn limit reached. Debate complete!" : "Type your argument here... (Press Enter to send, Shift+Enter for new line)"}
                className="flex-1 bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
                disabled={isSendingMessage || hasReachedLimit}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={startRecording}
                  disabled={isSendingMessage || hasReachedLimit}
                  className="px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg shadow-red-500/30 flex items-center gap-2"
                  title={hasReachedLimit ? "Turn limit reached" : "Record voice message"}
                >
                  <MicrophoneIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isSendingMessage || hasReachedLimit}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/30"
                >
                  {isSendingMessage ? "..." : "Send"}
                </button>
              </div>
            </div>
          )}
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Debating with: <span className="text-purple-300">{participants.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}</span>
            </span>
            {!hasReachedLimit && (
              <span className="text-blue-300">
                {turnsRemaining} turn{turnsRemaining === 1 ? '' : 's'} remaining
              </span>
            )}
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="max-w-5xl mx-auto mt-4 flex items-center justify-between text-sm text-slate-400">
        <div>
          Messages: {messages.length}
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${
            hasReachedLimit 
              ? 'text-red-400' 
              : isSendingMessage 
                ? 'text-yellow-400' 
                : 'text-green-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              hasReachedLimit 
                ? 'bg-red-400' 
                : isSendingMessage 
                  ? 'bg-yellow-400 animate-pulse' 
                  : 'bg-green-400'
            }`}></div>
            {hasReachedLimit ? 'Complete' : isSendingMessage ? 'Sending' : 'Ready'}
          </div>
        </div>
      </div>
    </div>
  );
}