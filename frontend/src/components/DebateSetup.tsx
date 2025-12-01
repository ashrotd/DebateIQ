import { useState } from 'react';
import { Figure, DebateMode } from '../types';

interface DebateSetupProps {
  figures: Figure[];
  onStartDebate: (topic: string, participants: string[], maxTurns: number, mode: DebateMode) => void;
  onCancel: () => void;
}

export default function DebateSetup({ figures, onStartDebate, onCancel }: DebateSetupProps) {
  const [topic, setTopic] = useState('');
  const [selectedFigures, setSelectedFigures] = useState<string[]>([]);
  const [maxTurns, setMaxTurns] = useState(6);
  const [debateMode, setDebateMode] = useState<DebateMode>('user-vs-figure');

  const toggleFigure = (figureId: string) => {
    if (selectedFigures.includes(figureId)) {
      setSelectedFigures(selectedFigures.filter(id => id !== figureId));
    } else {
      // For user-vs-figure: only 1 opponent, for figure-vs-figure: exactly 2 figures
      const maxSelection = debateMode === 'user-vs-figure' ? 1 : 2;
      if (selectedFigures.length < maxSelection) {
        setSelectedFigures([...selectedFigures, figureId]);
      } else if (debateMode === 'figure-vs-figure') {
        
        setSelectedFigures([selectedFigures[1], figureId]);
      } else {
        setSelectedFigures([figureId]);
      }
    }
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (topic.trim() && isValid) {
      onStartDebate(topic, selectedFigures, maxTurns, debateMode);
    }
  };

  const requiredFigures = debateMode === 'user-vs-figure' ? 1 : 2;
  const isValid = topic.trim() && selectedFigures.length === requiredFigures;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2C2520] via-[#3D3530] to-[#2C2520] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-[#3D3530]/80 backdrop-blur-xl rounded-2xl border border-[#EECEC5]/20 p-8">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F7F2E1] to-[#D4C5A9] mb-6">
          Setup Your Debate
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Debate Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-[#EECEC5] mb-3">
              Debate Mode *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setDebateMode('user-vs-figure');
                  setSelectedFigures([]);
                }}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  debateMode === 'user-vs-figure'
                    ? 'border-[#EECEC5] bg-[#EECEC5]/20'
                    : 'border-[#3D3530] bg-[#2C2520]/30 hover:border-[#EECEC5]/50'
                }`}
              >
                <div className="text-lg font-semibold text-white mb-1">User vs Figure</div>
                <div className="text-xs text-[#D4C5A9]">Debate directly with a historical figure</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDebateMode('figure-vs-figure');
                  setSelectedFigures([]);
                }}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  debateMode === 'figure-vs-figure'
                    ? 'border-[#EECEC5] bg-[#EECEC5]/20'
                    : 'border-[#3D3530] bg-[#2C2520]/30 hover:border-[#EECEC5]/50'
                }`}
              >
                <div className="text-lg font-semibold text-white mb-1">Figure vs Figure</div>
                <div className="text-xs text-[#D4C5A9]">Watch two figures debate each other</div>
              </button>
            </div>
          </div>

          {/* Topic Input */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-[#EECEC5] mb-2">
              Debate Topic *
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Should artificial intelligence be regulated?"
              className="w-full px-4 py-3 bg-[#2C2520]/50 border border-[#EECEC5]/30 rounded-lg text-white placeholder-[#D4C5A9]/50 focus:outline-none focus:ring-2 focus:ring-[#EECEC5]/50 focus:border-transparent"
              required
            />
          </div>

          {/* Participant Selection */}
          <div>
            <label className="block text-sm font-medium text-[#EECEC5] mb-3">
              {debateMode === 'user-vs-figure' ? 'Choose Your Debate Opponent *' : 'Choose Two Debaters *'}
            </label>
            <div className="grid grid-cols-1 gap-3">
              {figures.map((figure) => (
                <button
                  key={figure.id}
                  type="button"
                  onClick={() => toggleFigure(figure.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
                    selectedFigures.includes(figure.id)
                      ? 'border-[#EECEC5] bg-[#EECEC5]/20'
                      : 'border-[#3D3530] bg-[#2C2520]/30 hover:border-[#EECEC5]/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedFigures.includes(figure.id)
                        ? 'border-[#EECEC5] bg-[#EECEC5]'
                        : 'border-[#D4C5A9]/50'
                    }`}>
                      {selectedFigures.includes(figure.id) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{figure.name}</div>
                      <div className="text-sm text-[#D4C5A9]">{figure.specialty}</div>
                    </div>
                  </div>
                  {figure.warning && (
                    <div className="mt-2 text-xs text-yellow-400 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {figure.warning}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-[#D4C5A9]">
              {debateMode === 'user-vs-figure'
                ? (selectedFigures.length > 0
                    ? `Debating with ${figures.find(f => f.id === selectedFigures[0])?.name}`
                    : 'Select one opponent')
                : (selectedFigures.length === 2
                    ? `${figures.find(f => f.id === selectedFigures[0])?.name} vs ${figures.find(f => f.id === selectedFigures[1])?.name}`
                    : `Select ${2 - selectedFigures.length} more figure${selectedFigures.length === 1 ? '' : 's'}`)}
            </p>
          </div>

          {/* Max Turns */}
          <div>
            <label htmlFor="maxTurns" className="block text-sm font-medium text-[#EECEC5] mb-2">
              Debate Length {debateMode === 'figure-vs-figure' ? '(total exchanges)' : '(your turns)'}
            </label>
            <select
              id="maxTurns"
              value={maxTurns}
              onChange={(e) => setMaxTurns(Number(e.target.value))}
              className="w-full px-4 py-3 bg-[#2C2520]/50 border border-[#EECEC5]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#EECEC5]/50 focus:border-transparent"
            >
              <option value={2}>Very Short ({debateMode === 'figure-vs-figure' ? '2 exchanges (4 messages)' : '2 turns'})</option>
              <option value={3}>Quick ({debateMode === 'figure-vs-figure' ? '3 exchanges (6 messages)' : '3 turns'})</option>
              <option value={4}>Short ({debateMode === 'figure-vs-figure' ? '4 exchanges (8 messages)' : '4 turns'})</option>
              <option value={6}>Medium ({debateMode === 'figure-vs-figure' ? '6 exchanges (12 messages)' : '6 turns'})</option>
              <option value={8}>Long ({debateMode === 'figure-vs-figure' ? '8 exchanges (16 messages)' : '8 turns'})</option>
              <option value={10}>Extended ({debateMode === 'figure-vs-figure' ? '10 exchanges (20 messages)' : '10 turns'})</option>
            </select>
            {debateMode === 'figure-vs-figure' && (
              <p className="mt-2 text-xs text-[#D4C5A9]">
                Each exchange = 1 argument from each figure (2 messages total)
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={!isValid}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                isValid
                  ? 'bg-gradient-to-r from-[#EECEC5] to-[#F1D3B2] hover:from-[#F1D3B2] hover:to-[#D2A679] text-white shadow-lg shadow-[#EECEC5]/30'
                  : 'bg-[#3D3530] text-[#D4C5A9]/50 cursor-not-allowed'
              }`}
            >
              Start Debate
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-lg font-semibold bg-[#3D3530] text-[#D4C5A9] hover:bg-[#2C2520] transition-all"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Helper Text */}
        <div className="mt-6 p-4 bg-[#EECEC5]/10 rounded-lg border border-[#EECEC5]/20">
          <p className="text-sm text-[#F1D3B2]">
            <strong>Tip:</strong> {debateMode === 'user-vs-figure'
              ? 'You will debate directly with your chosen historical figure! Type your arguments and they will respond in character with their unique perspective and knowledge.'
              : 'Watch two historical figures debate each other! The debate will run automatically, and the judge will evaluate each exchange.'}
          </p>
        </div>
      </div>
    </div>
  );
}
