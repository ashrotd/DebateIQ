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
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-[#EECEC5] to-[#F1D3B2] rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500`}></div>

      <div className="relative bg-[#3D3530]/80 backdrop-blur-sm border border-[#EECEC5]/30 rounded-2xl p-6 hover:border-[#EECEC5] transition-all duration-300 transform group-hover:scale-[1.02]">
        <div className="relative mb-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#EECEC5]/20 to-[#F1D3B2]/20 rounded-full flex items-center justify-center border-2 border-[#EECEC5]/30 group-hover:border-[#EECEC5] transition-all duration-300">
            {figure.image === 'custom_figure.jpg' ? (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#EECEC5] to-[#F1D3B2] flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {figure.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            ) : (
              <img
                src={new URL(`../assets/figures/${figure.image}`, import.meta.url).href}
                alt={figure.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
          </div>
          <div className="absolute -top-2 -right-2 bg-[#EECEC5] text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            AI
          </div>
        </div>

        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-[#F7F2E1] mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#F7F2E1] group-hover:to-[#EECEC5] transition-all duration-300">
            {figure.name}
          </h3>
          <p className="text-[#D4C5A9] text-sm mb-1">{figure.title}</p>
          <p className="text-[#F1D3B2]/70 text-xs">{figure.era}</p>
        </div>

        <div className="bg-gradient-to-r from-[#3D3530]/50 to-[#2C2520]/50 border border-[#EECEC5]/30 rounded-xl p-3 mb-4">
          <p className="text-[#D4C5A9] text-sm">
            <span className="font-semibold text-[#F7F2E1]">Expertise:</span>
            <br />
            {figure.specialty}
          </p>
        </div>

        {figure.warning && (
          <div className="bg-[#DAA520]/30 border border-[#B8860B]/50 rounded-lg p-3 mb-4 flex items-start gap-2">
            <span className="text-[#FFD700] text-sm">⚠️</span>
            <p className="text-[#F0E68C] text-xs flex-1">{figure.warning}</p>
          </div>
        )}

        <button
          onClick={() => onStartDebate(figure.id)}
          className="w-full bg-gradient-to-r from-[#EECEC5] to-[#F1D3B2] hover:from-[#F1D3B2] hover:to-[#D2A679] text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-[#EECEC5]/50"
        >
          <span className="flex items-center justify-center gap-2">
            Challenge to Debate
            <span className={`transform transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}>
              →
            </span>
          </span>
        </button>

        <div className={`absolute inset-x-6 bottom-24 bg-[#2C2520]/95 backdrop-blur-sm border border-[#EECEC5]/50 rounded-xl p-4 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[#EECEC5] text-xs font-semibold">Logic</div>
              <div className="text-[#F7F2E1] text-lg font-bold">A+</div>
            </div>
            <div>
              <div className="text-[#F1D3B2] text-xs font-semibold">Rhetoric</div>
              <div className="text-[#F7F2E1] text-lg font-bold">S</div>
            </div>
            <div>
              <div className="text-[#D4C5A9] text-xs font-semibold">History</div>
              <div className="text-[#F7F2E1] text-lg font-bold">A+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}