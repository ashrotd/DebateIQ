import { useState, useRef, useEffect } from "react";
import { DebateMessage, DebateMode } from "../types";
import { apiService } from "../services/api";
import { SpeakerWaveIcon, SpeakerXMarkIcon, MicrophoneIcon, StopIcon, PlayIcon, PauseIcon } from "@heroicons/react/24/solid";

import ScoreCard from './ScoreCard';
import FactCheckBadge from './FactCheckBadge';
import Scoreboard from './Scoreboard';
import { JudgeEvaluation, CumulativeScores } from '../types';

const API_BASE_URL = "http://localhost:8000";
const MAX_USER_TURNS = 4;

interface DebateArenaProps {
  sessionId: string;
  topic: string;
  participants: string[];
  mode: DebateMode;
  onBack: () => void;
}

export default function DebateArena({ sessionId, topic, participants, mode, onBack }: DebateArenaProps) {
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

  // Figure vs Figure mode state
  const [currentTurn, setCurrentTurn] = useState(0);
  const [maxTurns, setMaxTurns] = useState(MAX_USER_TURNS);
  const [isGeneratingTurn, setIsGeneratingTurn] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [latestEvaluation, setLatestEvaluation] = useState<JudgeEvaluation | null>(null);
const [cumulativeScores, setCumulativeScores] = useState<CumulativeScores | null>(null);
const [isEvaluating, setIsEvaluating] = useState(false);
const [showJudge, setShowJudge] = useState(true);
const [showGameOver, setShowGameOver] = useState(false);

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

  const evaluateLastExchange = async () => {
  if (messages.length < 2) return; // Need at least user + AI message

  // Get last user message and last AI response
  const recentMessages = messages.slice(-2);
  const userMsg = recentMessages.find(m => m.role === 'user');
  const aiMsg = recentMessages.find(m => m.role === 'participant');

  if (!userMsg || !aiMsg) return;

  setIsEvaluating(true);
  try {
    const evaluation = await apiService.evaluateExchange(
      sessionId,
      userMsg.content,
      aiMsg.content
    );
    setLatestEvaluation(evaluation);

    // Fetch updated cumulative scores
    const cumulative = await apiService.getCumulativeScores(sessionId);
    setCumulativeScores(cumulative);
  } catch (err) {
    console.error('Failed to evaluate exchange:', err);
  } finally {
    setIsEvaluating(false);
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

      const newTurnCount = userTurnCount + 1;
      setUserTurnCount(newTurnCount);

      // Check if debate is finished after this turn
      if (newTurnCount >= MAX_USER_TURNS) {
        setTimeout(() => {
          setShowGameOver(true);
        }, 2000);
      }
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

      const newTurnCount = userTurnCount + 1;
      setUserTurnCount(newTurnCount);

      setTimeout(() => {
        evaluateLastExchange();
      }, 1000);

      // Check if debate is finished after this turn
      if (newTurnCount >= MAX_USER_TURNS) {
        setTimeout(() => {
          setShowGameOver(true);
        }, 2000); // Show game over dialog after evaluation completes
      }

      setUserInput("");
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

  // Figure vs Figure mode: Generate next turn manually
  const generateNextTurn = async () => {
    if (mode !== 'figure-vs-figure') return;
    if (isGeneratingTurn) return; // Prevent double clicks

    setIsGeneratingTurn(true);
    setIsSendingMessage(true);
    setError(null);

    try {
      const response = await apiService.generateNextTurn(sessionId);

      const newMessage: DebateMessage = {
        id: response.message.id || `msg-${Date.now()}`,
        session_id: sessionId,
        speaker_id: response.message.speaker_id || 'unknown',
        speaker_name: response.message.speaker_name || 'AI',
        role: 'participant',
        message_type: 'argument',
        content: response.message.content || '',
        timestamp: response.message.timestamp || new Date().toISOString(),
        turn_number: messages.length + 1,
        audio_url: response.message.audio_url,
      };

      setMessages((prev: DebateMessage[]) => [...prev, newMessage]);
      setCurrentTurn(response.current_turn);
      setMaxTurns(response.max_turns);

      // Evaluate the exchange if we have at least 2 messages (one from each figure)
      if (messages.length >= 1 && messages.length % 2 === 1) {
        setTimeout(() => {
          evaluateFigureExchange();
        }, 1000);
      }

      // Check if debate is complete
      if (response.current_turn >= response.max_turns * 2) {
        setTimeout(() => {
          setShowGameOver(true);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate turn');
    } finally {
      setIsSendingMessage(false);
      setIsGeneratingTurn(false);
    }
  };

  // Evaluate figure-vs-figure exchange
  const evaluateFigureExchange = async () => {
    if (messages.length < 2) return;

    // Get last two messages (one from each figure)
    const lastTwo = messages.slice(-2);
    if (lastTwo.length !== 2) return;

    setIsEvaluating(true);
    try {
      const evaluation = await apiService.evaluateExchange(
        sessionId,
        lastTwo[0].content,
        lastTwo[1].content
      );
      setLatestEvaluation(evaluation);

      // Fetch updated cumulative scores
      const cumulative = await apiService.getCumulativeScores(sessionId);
      setCumulativeScores(cumulative);
    } catch (err) {
      console.error('Failed to evaluate exchange:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Get the next speaker info for figure-vs-figure
  const getNextSpeaker = () => {
    if (mode !== 'figure-vs-figure' || participants.length < 2) return null;
    const nextSpeakerIndex = messages.length % 2;
    return participants[nextSpeakerIndex];
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
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#DAA520] to-[#B8860B] flex items-center justify-center font-bold text-white shadow-lg">
          M
        </div>
      );
    }

    if (speakerId === 'user') {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EECEC5] to-[#F1D3B2] flex items-center justify-center font-bold text-white shadow-lg">
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
            className="w-10 h-10 rounded-full object-cover border-2 border-[#EECEC5]/50 shadow-lg"
            alt={speakerId}
          />
        );
      } catch {
        return (
          <div className="w-10 h-10 rounded-full bg-[#D2A679] flex items-center justify-center font-bold text-white shadow-lg">
            {speakerId[0].toUpperCase()}
          </div>
        );
      }
    }

    return (
      <div className="w-10 h-10 rounded-full bg-[#D2A679] flex items-center justify-center font-bold text-white shadow-lg">
        {speakerId[0].toUpperCase()}
      </div>
    );
  };

  const getMessageStyle = (role: string) => {
    if (role === 'moderator') {
      return 'bg-gradient-to-r from-[#DAA520]/30 to-[#B8860B]/30 border-2 border-[#DAA520]/50';
    }
    if (role === 'user') {
      return 'bg-gradient-to-r from-[#EECEC5]/40 to-[#F1D3B2]/40 border-2 border-[#EECEC5]/60';
    }
    return 'bg-gradient-to-r from-[#D2A679]/60 to-[#C19A6B]/60 border-2 border-[#EECEC5]/50';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2C2520] via-[#3D3530] to-[#2C2520] p-4">
      {/* Scoreboard at the top */}
      {showJudge && (
        <Scoreboard
          cumulativeScores={cumulativeScores}
          aiName={participants[0] || 'AI'}
        />
      )}

      {/* Judge evaluation loading */}
      {isEvaluating && (
        <div className="flex items-center justify-center space-x-2 py-4 text-[#D4C5A9]">
          <div className="animate-spin h-5 w-5 border-2 border-[#EECEC5] border-t-transparent rounded-full" />
          <span>⚖️ Judge is evaluating and fact-checking...</span>
        </div>
      )}


      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-6">
        <button
          className="mb-4 px-4 py-2 bg-[#3D3530]/80 border border-[#EECEC5]/40 rounded-lg hover:bg-[#2C2520]/80 transition-all text-[#F7F2E1]"
          onClick={onBack}
        >
          ← Back to Selection
        </button>

        <div className="bg-[#3D3530]/80 backdrop-blur-xl rounded-xl border border-[#EECEC5]/30 p-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F7F2E1] to-[#D4C5A9]">
              {topic}
            </h1>
            <div className="flex items-center gap-3">
              {/* Turn Counter */}
              {mode === 'user-vs-figure' ? (
                <div className={`px-4 py-2 rounded-lg font-semibold ${
                  hasReachedLimit
                    ? 'bg-[#8B4513]/30 border border-[#A0522D]/50 text-[#FFA07A]'
                    : 'bg-[#3D3530]/40 border border-[#EECEC5]/50 text-[#EECEC5]'
                }`}>
                  Turns: {userTurnCount}/{MAX_USER_TURNS}
                </div>
              ) : (
                <div className="px-4 py-2 rounded-lg font-semibold bg-[#3D3530]/40 border border-[#EECEC5]/50 text-[#EECEC5]">
                  Messages: {messages.length}
                </div>
              )}

              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (voiceEnabled) stopAudio();
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  voiceEnabled
                    ? 'bg-gradient-to-r from-[#EECEC5] to-[#F1D3B2] hover:from-[#F1D3B2] hover:to-[#D2A679]'
                    : 'bg-[#3D3530] hover:bg-[#2C2520]'
                }`}
              >
                {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#D4C5A9]">
            <span>Participants:</span>
            {participants.map((p, i) => (
              <span key={p} className="text-[#F7F2E1]">
                {p}{i < participants.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="max-w-5xl mx-auto mb-4 p-4 bg-[#8B4513]/20 border border-[#A0522D]/50 rounded-xl">
          <p className="text-[#FFA07A]">Error: {error}</p>
        </div>
      )}

      {/* TURN LIMIT WARNING */}
      {hasReachedLimit && (
        <div className="max-w-5xl mx-auto mb-4 p-4 bg-[#DAA520]/20 border border-[#B8860B]/50 rounded-xl">
          <p className="text-[#FFD700] font-semibold">
            🎯 You've reached the maximum number of turns ({MAX_USER_TURNS}). The debate is complete!
          </p>
        </div>
      )}

      {/* LOW TURNS WARNING */}
      {!hasReachedLimit && turnsRemaining <= 2 && turnsRemaining > 0 && (
        <div className="max-w-5xl mx-auto mb-4 p-4 bg-[#CD853F]/20 border border-[#D2691E]/50 rounded-xl">
          <p className="text-[#F4A460]">
            ⚠️ Only {turnsRemaining} turn{turnsRemaining === 1 ? '' : 's'} remaining!
          </p>
        </div>
      )}

      {/* MESSAGES BOX */}
      <div className="max-w-5xl mx-auto bg-[#3D3530]/80 backdrop-blur-xl border-2 border-[#EECEC5]/40 rounded-2xl p-6 h-[65vh] overflow-y-auto space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full text-[#D4C5A9]">
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
                <span className="font-semibold text-[#F7F2E1]">{msg.speaker_name}</span>
                <span className="text-xs text-[#D4C5A9]">
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
                      className="p-1 rounded hover:bg-[#EECEC5]/30 transition-all"
                    >
                      {currentlyPlaying === msg.id ? (
                        <SpeakerXMarkIcon className="w-5 h-5 text-[#EECEC5]" />
                      ) : (
                        <SpeakerWaveIcon className="w-5 h-5 text-[#EECEC5]" />
                      )}
                    </button>
                  ) : (
                    <SpeakerXMarkIcon className="w-5 h-5 text-[#3D3530] opacity-40" />
                  )}
                </div>
              </div>
              <div className={`rounded-xl px-4 py-3 ${getMessageStyle(msg.role)}`}>
                <p className="text-base leading-relaxed whitespace-pre-wrap text-[#F7F2E1]">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}

        {isSendingMessage && (
          <div className="flex items-center gap-3 text-[#EECEC5]">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-[#EECEC5] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#EECEC5] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#EECEC5] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">Waiting for AI response...</span>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* MESSAGE INPUT BOX */}
      <div className="max-w-5xl mx-auto mt-4">
        <div className="bg-[#3D3530]/60 backdrop-blur-xl border border-[#EECEC5]/20 rounded-2xl p-4">
          {mode === 'figure-vs-figure' ? (
            /* Figure vs Figure Controls - Manual Step-by-Step */
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="bg-[#2C2520]/50 rounded-lg p-4 border border-[#EECEC5]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#D4C5A9]">Debate Progress</span>
                  <span className="text-sm font-semibold text-[#EECEC5]">{Math.floor(currentTurn / 2)} / {maxTurns} exchanges ({currentTurn} / {maxTurns * 2} messages)</span>
                </div>
                <div className="w-full bg-[#3D3530] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#EECEC5] to-[#D2A679] h-full transition-all duration-500"
                    style={{ width: `${(currentTurn / (maxTurns * 2)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Next Speaker Info & Controls */}
              <div className="flex items-center justify-between gap-4 p-4 bg-[#3D3530]/40 rounded-lg border border-[#EECEC5]/30">
                <div className="flex-1">
                  {isSendingMessage ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin h-6 w-6 border-2 border-[#EECEC5] border-t-transparent rounded-full" />
                      <div>
                        <div className="text-[#F7F2E1] font-semibold">Generating response...</div>
                        <div className="text-sm text-[#D4C5A9]">Please wait while {getNextSpeaker()} formulates their argument</div>
                      </div>
                    </div>
                  ) : currentTurn >= maxTurns * 2 ? (
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🏁</span>
                      <div>
                        <div className="text-[#FFD700] font-semibold">Debate Complete!</div>
                        <div className="text-sm text-[#D4C5A9]">All {maxTurns * 2} turns have been completed</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">💬</span>
                      <div>
                        <div className="text-[#F7F2E1] font-semibold">
                          {messages.length === 0 ? 'Ready to start the debate' : `Next: ${getNextSpeaker()}'s turn`}
                        </div>
                        <div className="text-sm text-[#D4C5A9]">
                          {messages.length === 0
                            ? `${participants[0]} will make the opening statement`
                            : `Click the button to see their response`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={generateNextTurn}
                  disabled={isSendingMessage || isGeneratingTurn || currentTurn >= maxTurns * 2}
                  className="px-8 py-4 rounded-lg font-semibold transition-all shadow-lg flex items-center gap-3 bg-gradient-to-r from-[#EECEC5] to-[#F1D3B2] hover:from-[#F1D3B2] hover:to-[#D2A679] disabled:opacity-50 disabled:cursor-not-allowed disabled:from-[#3D3530] disabled:to-[#2C2520] whitespace-nowrap"
                >
                  <span className="text-2xl">▶</span>
                  <span>{messages.length === 0 ? 'Start Debate' : 'Next Turn'}</span>
                </button>
              </div>

              {/* Evaluation Status */}
              {isEvaluating && (
                <div className="flex items-center justify-center gap-2 p-3 bg-[#DAA520]/20 border border-[#B8860B]/30 rounded-lg">
                  <div className="animate-spin h-5 w-5 border-2 border-[#FFD700] border-t-transparent rounded-full" />
                  <span className="text-[#FFD700]">⚖️ Judge is evaluating the last exchange...</span>
                </div>
              )}

              {/* Latest Scores */}
              {latestEvaluation && !isEvaluating && messages.length >= 2 && (
                <div className="p-4 bg-gradient-to-r from-[#2C3E2E]/50 to-[#3D5A3F]/50 rounded-lg border border-[#8BA888]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#C8E6C9]">⚖️ Latest Round Score</span>
                    <span className="text-xs text-[#8BA888]">
                      Winner: {latestEvaluation.winner === 'user' ? participants[0] : latestEvaluation.winner === 'ai' ? participants[1] : 'Tie'}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-bold text-[#A8D08D]">{latestEvaluation.user_scores?.total || 0}</div>
                      <div className="text-xs text-[#D4C5A9]">{participants[0]}</div>
                    </div>
                    <div className="flex items-center text-[#8BA888]">-</div>
                    <div className="flex-1 text-center">
                      <div className="text-2xl font-bold text-[#D2691E]">{latestEvaluation.ai_scores?.total || 0}</div>
                      <div className="text-xs text-[#D4C5A9]">{participants[1]}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : isRecording ? (
            <div className="flex items-center justify-between gap-4 p-4 bg-[#8B4513]/20 border border-[#A0522D]/40 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#CD5C5C] rounded-full animate-pulse"></div>
                <span className="text-[#FFA07A] font-semibold">Recording...</span>
                <span className="text-[#D4C5A9]">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-2 bg-[#A0522D] hover:bg-[#8B4513] rounded-lg font-semibold transition-all flex items-center gap-2 text-[#F7F2E1]"
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
                className="flex-1 bg-[#2C2520]/50 border border-[#EECEC5]/30 rounded-lg px-4 py-3 text-[#F7F2E1] placeholder-[#D4C5A9] resize-none focus:outline-none focus:border-[#EECEC5]/60 focus:ring-2 focus:ring-[#EECEC5]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
                disabled={isSendingMessage || hasReachedLimit}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={startRecording}
                  disabled={isSendingMessage || hasReachedLimit}
                  className="px-4 py-3 bg-gradient-to-r from-[#A0522D] to-[#8B4513] hover:from-[#8B4513] hover:to-[#654321] disabled:from-[#4A5D4C] disabled:to-[#3D5A3F] disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg shadow-[#A0522D]/30 flex items-center gap-2"
                  title={hasReachedLimit ? "Turn limit reached" : "Record voice message"}
                >
                  <MicrophoneIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isSendingMessage || hasReachedLimit}
                  className="px-6 py-3 bg-gradient-to-r from-[#EECEC5] to-[#F1D3B2] hover:from-[#F1D3B2] hover:to-[#D2A679] disabled:from-[#3D3530] disabled:to-[#2C2520] disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-lg shadow-[#EECEC5]/30"
                >
                  {isSendingMessage ? "..." : "Send"}
                </button>
              </div>
            </div>
          )}
          <div className="mt-2 text-xs text-[#D4C5A9] flex items-center justify-between">
            <span>
              Debating with: <span className="text-[#F7F2E1]">{participants.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}</span>
            </span>
            {!hasReachedLimit && (
              <span className="text-[#EECEC5]">
                {turnsRemaining} turn{turnsRemaining === 1 ? '' : 's'} remaining
              </span>
            )}
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="max-w-5xl mx-auto mt-4 flex items-center justify-between text-sm text-[#D4C5A9]">
        <div>
          Messages: {messages.length}
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${
            hasReachedLimit
              ? 'text-[#CD853F]'
              : isSendingMessage
                ? 'text-[#DAA520]'
                : 'text-[#EECEC5]'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              hasReachedLimit
                ? 'bg-[#CD853F]'
                : isSendingMessage
                  ? 'bg-[#DAA520] animate-pulse'
                  : 'bg-[#EECEC5]'
            }`}></div>
            {hasReachedLimit ? 'Complete' : isSendingMessage ? 'Sending' : 'Ready'}
          </div>
        </div>
      </div>

      {/* GAME OVER MODAL */}
      {showGameOver && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-gradient-to-br from-[#2C3E2E] via-[#3D5A3F] to-[#2C3E2E] border-4 border-[#8BA888] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform animate-scaleIn">
            {/* Victory/Defeat Header */}
            <div className="text-center mb-6">
              {cumulativeScores && cumulativeScores.overall_winner === 'user' ? (
                <>
                  <div className="text-6xl mb-4 animate-bounce">🏆</div>
                  <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#F0E68C] to-[#FFD700] mb-2">
                    {mode === 'figure-vs-figure' ? 'WINNER!' : 'VICTORY!'}
                  </h2>
                  <p className="text-xl text-[#C8E6C9]">
                    {mode === 'figure-vs-figure'
                      ? `${participants[0] ? participants[0].charAt(0).toUpperCase() + participants[0].slice(1) : 'Figure 1'} won the debate!`
                      : 'You won the debate!'}
                  </p>
                </>
              ) : cumulativeScores && cumulativeScores.overall_winner === 'ai' ? (
                <>
                  <div className="text-6xl mb-4">😔</div>
                  <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#CD853F] via-[#DEB887] to-[#CD853F] mb-2">
                    {mode === 'figure-vs-figure' ? 'WINNER!' : 'DEFEAT'}
                  </h2>
                  <p className="text-xl text-[#F4A460]">
                    {mode === 'figure-vs-figure'
                      ? `${participants[1] ? participants[1].charAt(0).toUpperCase() + participants[1].slice(1) : 'Figure 2'} won the debate!`
                      : 'Better luck next time!'}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">🤝</div>
                  <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8BA888] via-[#A8C5A3] to-[#8BA888] mb-2">
                    TIE!
                  </h2>
                  <p className="text-xl text-[#D4C5A9]">Evenly matched!</p>
                </>
              )}
            </div>

            {/* Final Score */}
            {cumulativeScores && (
              <div className="bg-[#3D5A3F]/50 rounded-xl p-6 mb-6 border border-[#8BA888]/30">
                <h3 className="text-2xl font-bold text-center mb-4 text-[#F7F2E1]">Final Score</h3>
                <div className="flex justify-around items-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#6B8E23]">{cumulativeScores.user_cumulative_score}</div>
                    <div className="text-sm text-[#D4C5A9]">
                      {mode === 'figure-vs-figure'
                        ? (participants[0] ? participants[0].charAt(0).toUpperCase() + participants[0].slice(1) : 'Figure 1')
                        : 'You'}
                    </div>
                  </div>
                  <div className="text-3xl text-[#8BA888]">-</div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#A0522D]">{cumulativeScores.ai_cumulative_score}</div>
                    <div className="text-sm text-[#D4C5A9]">
                      {mode === 'figure-vs-figure'
                        ? (participants[1] ? participants[1].charAt(0).toUpperCase() + participants[1].slice(1) : 'Figure 2')
                        : (participants[0] ? participants[0].charAt(0).toUpperCase() + participants[0].slice(1) : 'AI')}
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm text-[#8BA888]">
                  {cumulativeScores.exchanges_evaluated} exchanges evaluated
                </div>
              </div>
            )}

            {/* Judge's Analysis */}
            {latestEvaluation && (
              <div className="bg-[#3D5A3F]/50 rounded-xl p-6 mb-6 border border-[#8BA888]/30">
                <h3 className="text-xl font-bold text-center mb-4 text-[#F7F2E1]">📊 Judge's Final Analysis</h3>

                {/* Scoring Breakdown */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* User Scores */}
                  <div className="bg-[#6B8E23]/30 rounded-lg p-4 border border-[#6B8E23]/40">
                    <div className="text-center mb-3">
                      <div className="text-sm font-semibold text-[#C8E6C9] mb-2">
                        {mode === 'figure-vs-figure'
                          ? `${participants[0] ? participants[0].charAt(0).toUpperCase() + participants[0].slice(1) : 'Figure 1'}'s Performance`
                          : 'Your Performance'}
                      </div>
                      <div className="text-3xl font-bold text-[#A8D08D]">
                        {latestEvaluation.user_scores?.total || 0}/50
                      </div>
                    </div>
                    {latestEvaluation.user_scores && (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Logic:</span>
                          <span className="font-semibold">{latestEvaluation.user_scores.logic || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Facts:</span>
                          <span className="font-semibold">{latestEvaluation.user_scores.factual_accuracy || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Rhetoric:</span>
                          <span className="font-semibold">{latestEvaluation.user_scores.rhetoric || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Relevance:</span>
                          <span className="font-semibold">{latestEvaluation.user_scores.relevance || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Rebuttal:</span>
                          <span className="font-semibold">{latestEvaluation.user_scores.rebuttal || 0}/10</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Scores */}
                  <div className="bg-[#8B4513]/30 rounded-lg p-4 border border-[#A0522D]/40">
                    <div className="text-center mb-3">
                      <div className="text-sm font-semibold text-[#DEB887] mb-2">
                        {mode === 'figure-vs-figure'
                          ? `${participants[1] ? participants[1].charAt(0).toUpperCase() + participants[1].slice(1) : 'Figure 2'}'s Performance`
                          : `${participants[0] ? participants[0].charAt(0).toUpperCase() + participants[0].slice(1) : 'AI'}'s Performance`}
                      </div>
                      <div className="text-3xl font-bold text-[#D2691E]">
                        {latestEvaluation.ai_scores?.total || 0}/50
                      </div>
                    </div>
                    {latestEvaluation.ai_scores && (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Logic:</span>
                          <span className="font-semibold">{latestEvaluation.ai_scores.logic || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Facts:</span>
                          <span className="font-semibold">{latestEvaluation.ai_scores.factual_accuracy || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Rhetoric:</span>
                          <span className="font-semibold">{latestEvaluation.ai_scores.rhetoric || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Relevance:</span>
                          <span className="font-semibold">{latestEvaluation.ai_scores.relevance || 0}/10</span>
                        </div>
                        <div className="flex justify-between text-[#F7F2E1]">
                          <span>Rebuttal:</span>
                          <span className="font-semibold">{latestEvaluation.ai_scores.rebuttal || 0}/10</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Winner Reason */}
                {latestEvaluation.winner_reason && (
                  <div className="bg-[#2C3E2E]/50 rounded-lg p-4 border border-[#8BA888]">
                    <div className="text-sm font-semibold text-[#FFD700] mb-2">⚖️ Judge's Verdict:</div>
                    <p className="text-sm text-[#F7F2E1] leading-relaxed">{latestEvaluation.winner_reason}</p>
                  </div>
                )}

                {/* Detailed Reasoning */}
                {latestEvaluation.reasoning && (
                  <div className="mt-4 space-y-3">
                    {latestEvaluation.reasoning.user_analysis && (
                      <div className="bg-[#6B8E23]/20 rounded-lg p-3 border border-[#6B8E23]/30">
                        <div className="text-xs font-semibold text-[#C8E6C9] mb-1">
                          {mode === 'figure-vs-figure'
                            ? `${participants[0] ? participants[0].charAt(0).toUpperCase() + participants[0].slice(1) : 'Figure 1'}'s Analysis:`
                            : 'Your Analysis:'}
                        </div>
                        <p className="text-xs text-[#F7F2E1] leading-relaxed">{latestEvaluation.reasoning.user_analysis}</p>
                      </div>
                    )}
                    {latestEvaluation.reasoning.ai_analysis && (
                      <div className="bg-[#8B4513]/20 rounded-lg p-3 border border-[#A0522D]/30">
                        <div className="text-xs font-semibold text-[#DEB887] mb-1">
                          {mode === 'figure-vs-figure'
                            ? `${participants[1] ? participants[1].charAt(0).toUpperCase() + participants[1].slice(1) : 'Figure 2'}'s Analysis:`
                            : `${participants[0] ? participants[0].charAt(0).toUpperCase() + participants[0].slice(1) : 'AI'}'s Analysis:`}
                        </div>
                        <p className="text-xs text-[#F7F2E1] leading-relaxed">{latestEvaluation.reasoning.ai_analysis}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Fact Checks */}
                {latestEvaluation.fact_checks && latestEvaluation.fact_checks.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-[#A8D08D] mb-2">🔍 Fact Checks:</div>
                    <div className="space-y-2">
                      {latestEvaluation.fact_checks.map((fc: any, idx: number) => (
                        <div key={idx} className="bg-[#2C3E2E]/50 rounded p-2 border border-[#8BA888]">
                          <div className="flex items-start gap-2">
                            <span className="text-xs">
                              {fc.verdict === 'true' ? '✅' : fc.verdict === 'false' ? '❌' : '⚠️'}
                            </span>
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-[#F7F2E1]">
                                {fc.claim}
                                <span className="ml-2 text-[#8BA888]">({fc.source})</span>
                              </div>
                              <div className="text-xs text-[#D4C5A9] mt-1">{fc.evidence}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#3D5A3F]/30 rounded-lg p-4 border border-[#8BA888]">
                <div className="text-sm text-[#D4C5A9]">Total Messages</div>
                <div className="text-2xl font-bold text-[#F7F2E1]">{messages.length}</div>
              </div>
              <div className="bg-[#3D5A3F]/30 rounded-lg p-4 border border-[#8BA888]">
                <div className="text-sm text-[#D4C5A9]">Your Turns</div>
                <div className="text-2xl font-bold text-[#C8E6C9]">{userTurnCount}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onBack}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#6B8E23] to-[#556B2F] hover:from-[#556B2F] hover:to-[#3D5A3F] rounded-lg font-semibold transition-all shadow-lg text-white"
              >
                New Debate
              </button>
              <button
                onClick={() => setShowGameOver(false)}
                className="px-6 py-3 bg-[#4A5D4C] hover:bg-[#5A6D5C] rounded-lg font-semibold transition-all text-white"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}