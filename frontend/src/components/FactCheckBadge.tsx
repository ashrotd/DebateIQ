import { FactCheck } from '../types';
import { useState } from 'react';

interface FactCheckBadgeProps {
  factChecks: FactCheck[];
}

export default function FactCheckBadge({ factChecks }: FactCheckBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (factChecks.length === 0) {
    return null;
  }

  const getVerdictConfig = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'true':
        return { emoji: '✅', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
      case 'false':
        return { emoji: '❌', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
      case 'partially true':
        return { emoji: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
      default:
        return { emoji: '❓', color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30' };
    }
  };

  return (
    <div className="my-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800/70 border border-purple-500/30 rounded-lg transition-all"
      >
        <div className="flex items-center space-x-2">
          <span className="text-xl">🔍</span>
          <span className="text-white font-semibold">
            Fact-Checks ({factChecks.length})
          </span>
        </div>
        <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-2 space-y-3">
          {factChecks.map((factCheck, index) => {
            const config = getVerdictConfig(factCheck.verdict);
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${config.bg} ${config.border}`}
              >
                {/* Claim */}
                <div className="mb-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-sm font-semibold text-slate-400 min-w-[60px]">
                      {factCheck.source === 'user' ? '👤 You' : '🤖 AI'}:
                    </span>
                    <p className="text-white flex-1">"{factCheck.claim}"</p>
                  </div>
                </div>

                {/* Verdict */}
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{config.emoji}</span>
                  <span className={`font-bold ${config.color}`}>
                    {factCheck.verdict.toUpperCase()}
                  </span>
                </div>

                {/* Evidence */}
                <div className="pl-8">
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-purple-300">Evidence:</span>{' '}
                    {factCheck.evidence}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
