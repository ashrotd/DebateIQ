import { Scores } from '../types';

interface ScoreCardProps {
  userScores: Scores;
  aiScores: Scores;
  aiName: string;
  winner: 'user' | 'ai' | 'tie';
  winnerReason: string;
}

export default function ScoreCard({ userScores, aiScores, aiName, winner, winnerReason }: ScoreCardProps) {
  const criteriaLabels = {
    logic: 'Logic & Reasoning',
    factual_accuracy: 'Factual Accuracy',
    rhetoric: 'Rhetorical Effectiveness',
    relevance: 'Relevance',
    rebuttal: 'Rebuttal Strength'
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBarWidth = (score: number) => `${(score / 10) * 100}%`;

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 my-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-purple-300">⚖️ Judge's Evaluation</h3>
        <div className={`px-4 py-2 rounded-lg font-semibold ${
          winner === 'user' ? 'bg-blue-500/20 text-blue-300' :
          winner === 'ai' ? 'bg-purple-500/20 text-purple-300' :
          'bg-slate-500/20 text-slate-300'
        }`}>
          {winner === 'user' ? '👤 You Won!' : winner === 'ai' ? `🤖 ${aiName} Won!` : '🤝 Tie'}
        </div>
      </div>

      <div className="mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
        <p className="text-sm text-purple-200">{winnerReason}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-semibold text-blue-300 mb-4 flex items-center">
            <span className="mr-2">👤</span> Your Scores
          </h4>
          <div className="space-y-3">
            {Object.entries(criteriaLabels).map(([key, label]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">{label}</span>
                  <span className={`font-bold ${getScoreColor(userScores[key as keyof typeof criteriaLabels])}`}>
                    {userScores[key as keyof typeof criteriaLabels]}/10
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    style={{ width: getScoreBarWidth(userScores[key as keyof typeof criteriaLabels]) }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">Total</span>
                <span className="text-2xl font-bold text-blue-300">{userScores.total}/50</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-purple-300 mb-4 flex items-center">
            <span className="mr-2">🤖</span> {aiName}'s Scores
          </h4>
          <div className="space-y-3">
            {Object.entries(criteriaLabels).map(([key, label]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">{label}</span>
                  <span className={`font-bold ${getScoreColor(aiScores[key as keyof typeof criteriaLabels])}`}>
                    {aiScores[key as keyof typeof criteriaLabels]}/10
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: getScoreBarWidth(aiScores[key as keyof typeof criteriaLabels]) }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">Total</span>
                <span className="text-2xl font-bold text-purple-300">{aiScores.total}/50</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
