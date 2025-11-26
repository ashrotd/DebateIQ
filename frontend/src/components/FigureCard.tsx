import { useState } from 'react';

interface Figure {
  id: string;
  name: string;
  title: string;
  era: string;
  specialty: string;
  image: string;
  warning?: string;
}

interface FigureCardProps {
  figure: Figure;
  onStartDebate: (figureId: string) => void;
}

export default function FigureCard({ figure, onStartDebate }: FigureCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect on hover */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500`}></div>
      
      <div className="relative bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-purple-500 transition-all duration-300 transform group-hover:scale-[1.02]">
        {/* Image */}
        <div className="relative mb-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center border-2 border-purple-500/30 group-hover:border-purple-500 transition-all duration-300">
            {figure.image === 'custom_figure.jpg' ? (
              // Custom figure with initials
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {figure.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            ) : (
              // Default figures with actual images
              <img
                src={new URL(`../assets/figures/${figure.image}`, import.meta.url).href}
                alt={figure.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
          </div>
          {/* Floating badge */}
          <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            AI
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
            {figure.name}
          </h3>
          <p className="text-slate-400 text-sm mb-1">{figure.title}</p>
          <p className="text-slate-500 text-xs">{figure.era}</p>
        </div>

        {/* Specialty badge */}
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl p-3 mb-4">
          <p className="text-purple-200 text-sm">
            <span className="font-semibold text-purple-300">Expertise:</span>
            <br />
            {figure.specialty}
          </p>
        </div>

        {/* Warning if exists */}
        {figure.warning && (
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 mb-4 flex items-start gap-2">
            <span className="text-yellow-400 text-sm">⚠️</span>
            <p className="text-yellow-200 text-xs flex-1">{figure.warning}</p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={() => onStartDebate(figure.id)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
        >
          <span className="flex items-center justify-center gap-2">
            Challenge to Debate
            <span className={`transform transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}>
              →
            </span>
          </span>
        </button>

        {/* Stats overlay on hover */}
        <div className={`absolute inset-x-6 bottom-24 bg-slate-950/95 backdrop-blur-sm border border-purple-500/50 rounded-xl p-4 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-purple-400 text-xs font-semibold">Logic</div>
              <div className="text-white text-lg font-bold">A+</div>
            </div>
            <div>
              <div className="text-pink-400 text-xs font-semibold">Rhetoric</div>
              <div className="text-white text-lg font-bold">S</div>
            </div>
            <div>
              <div className="text-blue-400 text-xs font-semibold">History</div>
              <div className="text-white text-lg font-bold">A+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}