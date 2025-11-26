import { useState } from 'react';
import { CreateCustomFigureRequest } from '../types';
import apiService from '../services/api';

interface CreateCustomFigureProps {
  onFigureCreated: () => void;
  onCancel: () => void;
}

export default function CreateCustomFigure({ onFigureCreated, onCancel }: CreateCustomFigureProps) {
  const [figureName, setFigureName] = useState('');
  const [topic, setTopic] = useState('');
  const [relatedTopicsInput, setRelatedTopicsInput] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [era, setEra] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsCreating(true);

    // Parse related topics (comma-separated)
    const relatedTopics = relatedTopicsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const request: CreateCustomFigureRequest = {
      figure_name: figureName,
      topic: topic,
      related_topics: relatedTopics,
      specialty: specialty || undefined,
      era: era || undefined,
    };

    try {
      const response = await apiService.createCustomFigure(request);
      setSuccess(response.message);

      // Wait a moment to show success message
      setTimeout(() => {
        onFigureCreated();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create custom figure';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const isValid = figureName.trim() && topic.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
          Create Custom Historical Figure
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Create a custom debate opponent using Wikipedia knowledge and RAG technology
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Figure Name */}
          <div>
            <label htmlFor="figureName" className="block text-sm font-medium text-purple-300 mb-2">
              Historical Figure Name *
            </label>
            <input
              id="figureName"
              type="text"
              value={figureName}
              onChange={(e) => setFigureName(e.target.value)}
              placeholder="e.g., King Mahendra"
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              required
              disabled={isCreating}
            />
          </div>

          {/* Wikipedia Topic */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-purple-300 mb-2">
              Wikipedia Topic *
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Mahendra of Nepal"
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              required
              disabled={isCreating}
            />
            <p className="mt-1 text-xs text-slate-500">
              The exact Wikipedia article name to search for
            </p>
          </div>

          {/* Related Topics */}
          <div>
            <label htmlFor="relatedTopics" className="block text-sm font-medium text-purple-300 mb-2">
              Related Wikipedia Topics (Optional)
            </label>
            <input
              id="relatedTopics"
              type="text"
              value={relatedTopicsInput}
              onChange={(e) => setRelatedTopicsInput(e.target.value)}
              placeholder="e.g., Panchayat Nepal, Kingdom of Nepal"
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              disabled={isCreating}
            />
            <p className="mt-1 text-xs text-slate-500">
              Comma-separated list of related topics for additional context
            </p>
          </div>

          {/* Specialty */}
          <div>
            <label htmlFor="specialty" className="block text-sm font-medium text-purple-300 mb-2">
              Specialty/Expertise (Optional)
            </label>
            <input
              id="specialty"
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g., Nepalese monarchy, Panchayat system"
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              disabled={isCreating}
            />
          </div>

          {/* Era */}
          <div>
            <label htmlFor="era" className="block text-sm font-medium text-purple-300 mb-2">
              Historical Era (Optional)
            </label>
            <input
              id="era"
              type="text"
              value={era}
              onChange={(e) => setEra(e.target.value)}
              placeholder="e.g., 1920-1972"
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              disabled={isCreating}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={!isValid || isCreating}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                isValid && !isCreating
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isCreating ? 'Creating Agent with RAG...' : 'Create Figure'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isCreating}
              className="px-6 py-3 rounded-lg font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-sm text-blue-200">
            <strong>How it works:</strong> The system will search Wikipedia for your historical figure
            and build a knowledge base using RAG (Retrieval Augmented Generation). The figure must be
            well-known enough to have a Wikipedia article. The agent will use this knowledge to debate
            in character with accurate historical context.
          </p>
        </div>
      </div>
    </div>
  );
}
