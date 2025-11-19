interface HeaderProps {
  backendStatus: 'checking' | 'connected' | 'disconnected';
}

export default function Header({ backendStatus }: HeaderProps) {
  const statusConfig = {
    checking: { color: 'bg-yellow-500', text: 'Checking...', icon: '⏳' },
    connected: { color: 'bg-green-500', text: 'Connected', icon: '✓' },
    disconnected: { color: 'bg-red-500', text: 'Disconnected', icon: '✗' }
  };

  const status = statusConfig[backendStatus];

  return (
    <header className="container mx-auto px-4 pt-8 pb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50">
            <span className="text-2xl">🎭</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">DebateIQ Arena</h1>
            <p className="text-sm text-purple-300">Debate with your favorite historical figures</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-full px-4 py-2">
          <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`}></div>
          <span className="text-sm text-slate-300">{status.icon} {status.text}</span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-4">
          Choose Your Opponent
        </h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Engage in intellectual combat with history's most influential minds. 
          Powered by advanced AI and historical research.
        </p>
      </div>
    </header>
  );
}