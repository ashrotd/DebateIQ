import { useState } from 'react';
import { Figure } from '../types';

interface DebateSetupProps {
  figures: Figure[];
  onStartDebate: (topic: string, participants: string[], maxTurns: number) => void;
  onCancel: () => void;
}

export default function DebateSetup({ figures, onStartDebate, onCancel }: DebateSetupProps) {
  const [topic, setTopic] = useState('');
  const [selectedFigures, setSelectedFigures] = useState<string[]>([]);
  const [maxTurns, setMaxTurns] = useState(6);

  const toggleFigure = (figureId: string) => {
    if (selectedFigures.includes(figureId)) {
      setSelectedFigures(selectedFigures.filter(id => id !== figureId));
    } else {
      // For user-interactive debates, only allow selecting 1 opponent
      setSelectedFigures([figureId]);
    }
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (topic.trim() && selectedFigures.length === 1) {
      onStartDebate(topic, selectedFigures, maxTurns);
    }
  };

  const isValid = topic.trim() && selectedFigures.length === 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
          Setup Your Debate
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Input */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-purple-300 mb-2">
              Debate Topic *
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Should artificial intelligence be regulated?"
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              required
            />
          </div>

          {/* Participant Selection */}
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-3">
              Choose Your Debate Opponent *
            </label>
            <div className="grid grid-cols-1 gap-3">
              {figures.map((figure) => (
                <button
                  key={figure.id}
                  type="button"
                  onClick={() => toggleFigure(figure.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
                    selectedFigures.includes(figure.id)
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-slate-700 bg-slate-800/30 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedFigures.includes(figure.id)
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-slate-600'
                    }`}>
                      {selectedFigures.includes(figure.id) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{figure.name}</div>
                      <div className="text-sm text-slate-400">{figure.specialty}</div>
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
            <p className="mt-2 text-sm text-slate-400">
              {selectedFigures.length > 0 ? `Debating with ${figures.find(f => f.id === selectedFigures[0])?.name}` : 'Select one opponent'}
            </p>
          </div>

          {/* Max Turns */}
          <div>
            <label htmlFor="maxTurns" className="block text-sm font-medium text-purple-300 mb-2">
              Debate Length (turns per participant)
            </label>
            <select
              id="maxTurns"
              value={maxTurns}
              onChange={(e) => setMaxTurns(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
            >
              <option value={4}>Short (4 turns)</option>
              <option value={6}>Medium (6 turns)</option>
              <option value={8}>Long (8 turns)</option>
              <option value={10}>Extended (10 turns)</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={!isValid}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                isValid
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Start Debate
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-lg font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Helper Text */}
        <div className="mt-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <p className="text-sm text-purple-200">
            <strong>Tip:</strong> You will debate directly with your chosen historical figure!
            Type your arguments and they will respond in character with their unique perspective and knowledge.
          </p>
        </div>
      </div>
    </div>
  );
}
