interface HeaderProps {
  backendStatus: 'checking' | 'connected' | 'disconnected';
}

export default function Header({ backendStatus }: HeaderProps) {
  const statusConfig = {
    checking: { color: 'bg-[#DAA520]', text: 'Checking...', icon: '⏳' },
    connected: { color: 'bg-[#EECEC5]', text: 'Connected', icon: '✓' },
    disconnected: { color: 'bg-[#A0522D]', text: 'Disconnected', icon: '✗' }
  };

  const status = statusConfig[backendStatus];

  return (
    <header className="container mx-auto px-4 pt-8 pb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#EECEC5] to-[#F1D3B2] rounded-xl flex items-center justify-center shadow-lg shadow-[#EECEC5]/50">
            <span className="text-2xl">🎭</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#F7F2E1]">DebateIQ Arena</h1>
            <p className="text-sm text-[#D4C5A9]">Debate with your favorite historical figures</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#3D3530]/50 backdrop-blur-sm border border-[#EECEC5]/30 rounded-full px-4 py-2">
          <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`}></div>
          <span className="text-sm text-[#D4C5A9]">{status.icon} {status.text}</span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F7F2E1] via-[#EECEC5] to-[#F1D3B2] mb-4">
          Choose Your Opponent
        </h2>
        <p className="text-lg text-[#D4C5A9] max-w-2xl mx-auto">
          Engage in intellectual combat with history's most influential minds.
          Powered by advanced AI and historical research.
        </p>
      </div>
    </header>
  );
}