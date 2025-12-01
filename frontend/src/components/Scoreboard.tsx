import { CumulativeScores } from '../types';

interface ScoreboardProps {
  cumulativeScores: CumulativeScores | null;
  aiName: string;
}

export default function Scoreboard({ cumulativeScores, aiName }: ScoreboardProps) {
  if (!cumulativeScores || cumulativeScores.exchanges_evaluated === 0) {
    return (
      <div className="bg-gradient-to-r from-[#3D5A3F]/50 to-[#4A5D4C]/50 border border-[#8BA888]/30 rounded-xl p-6 mb-6">
        <div className="text-center text-[#D4C5A9]">
          <p className="text-lg">⚖️ No evaluations yet</p>
          <p className="text-sm mt-2">Scores will appear after the judge evaluates exchanges</p>
        </div>
      </div>
    );
  }

  const userScore = cumulativeScores.user_cumulative_score;
  const aiScore = cumulativeScores.ai_cumulative_score;
  const totalScore = userScore + aiScore;
  const userPercentage = totalScore > 0 ? (userScore / totalScore) * 100 : 50;
  const aiPercentage = totalScore > 0 ? (aiScore / totalScore) * 100 : 50;

  return (
    <div className="bg-gradient-to-r from-[#3D5A3F]/50 to-[#4A5D4C]/50 border border-[#8BA888]/30 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F7F2E1] to-[#D4C5A9]">
          📊 Live Scoreboard
        </h2>
        <span className="text-sm text-[#8BA888]">
          {cumulativeScores.exchanges_evaluated} {cumulativeScores.exchanges_evaluated === 1 ? 'exchange' : 'exchanges'} evaluated
        </span>
      </div>

      <div className="mb-6">
        <div className="flex h-8 rounded-full overflow-hidden bg-[#2C3E2E]">
          <div
            className="bg-gradient-to-r from-[#6B8E23] to-[#556B2F] flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
            style={{ width: `${userPercentage}%` }}
          >
            {userPercentage > 15 && `${Math.round(userPercentage)}%`}
          </div>
          <div
            className="bg-gradient-to-r from-[#A0522D] to-[#8B4513] flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
            style={{ width: `${aiPercentage}%` }}
          >
            {aiPercentage > 15 && `${Math.round(aiPercentage)}%`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#6B8E23]/10 border border-[#6B8E23]/30 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl mb-2">👤</div>
            <div className="text-sm text-[#D4C5A9] mb-1">You</div>
            <div className="text-3xl font-bold text-[#A8D08D]">{userScore}</div>
            <div className="text-xs text-[#8BA888] mt-1">points</div>
          </div>
        </div>

        <div className="bg-[#A0522D]/10 border border-[#A0522D]/30 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl mb-2">🤖</div>
            <div className="text-sm text-[#D4C5A9] mb-1">{aiName.charAt(0).toUpperCase() + aiName.slice(1)}</div>
            <div className="text-3xl font-bold text-[#DEB887]">{aiScore}</div>
            <div className="text-xs text-[#8BA888] mt-1">points</div>
          </div>
        </div>
      </div>

      <div className={`text-center p-4 rounded-lg ${
        cumulativeScores.overall_winner === 'user'
          ? 'bg-[#6B8E23]/20 border border-[#6B8E23]/30'
          : cumulativeScores.overall_winner === 'ai'
          ? 'bg-[#A0522D]/20 border border-[#A0522D]/30'
          : 'bg-[#4A5D4C]/20 border border-[#8BA888]/30'
      }`}>
        <div className="text-lg font-semibold mb-1 text-[#F7F2E1]">
          {cumulativeScores.overall_winner === 'user' && '👤 You are leading!'}
          {cumulativeScores.overall_winner === 'ai' && `${aiName.charAt(0).toUpperCase() + aiName.slice(1)} is leading!`}
          {cumulativeScores.overall_winner === 'tie' && 'Perfect tie!'}
        </div>
        <div className="text-sm text-[#D4C5A9]">
          {cumulativeScores.score_difference > 0 && (
            `By ${cumulativeScores.score_difference} points`
          )}
          {cumulativeScores.score_difference === 0 && 'Completely even'}
        </div>
      </div>
    </div>
  );
}
