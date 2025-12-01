import { useEffect, useState } from 'react'
import Header from './components/Header'
import FigureCard from './components/FigureCard'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'
import DebateArena from './components/DebateArena'
import DebateSetup from './components/DebateSetup'
import CreateCustomFigure from './components/CreateCustomFigure'
import { Figure, BackendStatus, DebateMode } from './types'
import apiService from './services/api'

type AppView = 'selection' | 'setup' | 'debate' | 'create-custom';

interface DebateConfig {
  sessionId: string;
  topic: string;
  participants: string[];
  mode: DebateMode;
}

function App() {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [currentView, setCurrentView] = useState<AppView>('selection');
  const [debateConfig, setDebateConfig] = useState<DebateConfig | null>(null);
  const [creatingDebate, setCreatingDebate] = useState(false);

  useEffect(() => {
    const testBackend = async () => {
      const isConnected = await apiService.testConnection();
      setBackendStatus(isConnected ? 'connected' : 'disconnected');
    };

    const fetchFigures = async () => {
      try {
        const fetchedFigures = await apiService.getFigures();
        setFigures(fetchedFigures);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    testBackend();
    fetchFigures();
  }, []);

  const handleSetupDebate = () => {
    setCurrentView('setup');
  };

  const handleStartDebate = async (topic: string, participants: string[], maxTurns: number, mode: DebateMode) => {
    setCreatingDebate(true);
    setError(null);

    try {
      // Create debate session with Google ADK
      const response = await apiService.createDebate({
        topic,
        participants,
        max_turns: maxTurns,
        mode
      });

      setDebateConfig({
        sessionId: response.session.session_id,
        topic: response.session.topic,
        participants: response.session.participants,
        mode
      });

      setCurrentView('debate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create debate');
      setCurrentView('selection');
    } finally {
      setCreatingDebate(false);
    }
  };

  const handleBackToSelection = () => {
    setCurrentView('selection');
    setDebateConfig(null);
  };

  const handleCancelSetup = () => {
    setCurrentView('selection');
  };

  const handleCreateCustomFigure = () => {
    setCurrentView('create-custom');
  };

  const handleCustomFigureCreated = async () => {
    // Refresh figures list
    try {
      const fetchedFigures = await apiService.getFigures();
      setFigures(fetchedFigures);
    } catch (err) {
      console.error('Error refreshing figures:', err);
    }
    setCurrentView('selection');
  };

  const handleCancelCustomFigure = () => {
    setCurrentView('selection');
  };

  // Show custom figure creation view
  if (currentView === 'create-custom') {
    return (
      <CreateCustomFigure
        onFigureCreated={handleCustomFigureCreated}
        onCancel={handleCancelCustomFigure}
      />
    );
  }

  // Show debate arena if debate is active
  if (currentView === 'debate' && debateConfig) {
    return (
      <DebateArena
        sessionId={debateConfig.sessionId}
        topic={debateConfig.topic}
        participants={debateConfig.participants}
        mode={debateConfig.mode}
        onBack={handleBackToSelection}
      />
    );
  }

  // Show debate setup view
  if (currentView === 'setup') {
    return (
      <DebateSetup
        figures={figures}
        onStartDebate={handleStartDebate}
        onCancel={handleCancelSetup}
      />
    );
  }

  // Show figure selection view
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2C2520] via-[#3D3530] to-[#2C2520] relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#D2A679] rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-[#C19A6B] rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '700ms' }}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-[#A67C52] rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }}></div>
      </div>

      <div className="relative z-10">
        <Header backendStatus={backendStatus} />

        <main className="container mx-auto px-4 py-12">
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {creatingDebate && (
            <div className="text-center text-[#D4C5A9] mb-4">
              <LoadingSpinner />
              <p className="mt-4">Creating debate session...</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F7F2E1] to-[#F1D3B2] mb-4">
                  Select Historical Figures for Your Debate
                </h1>
                <p className="text-[#D4C5A9] mb-6">
                  Choose your participants and let AI agents engage in an intellectual battle
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleSetupDebate}
                    className="px-8 py-3 bg-gradient-to-r from-[#D2A679] to-[#C19A6B] hover:from-[#C19A6B] hover:to-[#A67C52] rounded-lg font-semibold transition-all shadow-lg shadow-[#D2A679]/30 text-white"
                  >
                    Start New Debate
                  </button>
                  <button
                    onClick={handleCreateCustomFigure}
                    className="px-8 py-3 bg-gradient-to-r from-[#A0522D] to-[#8B4513] hover:from-[#8B4513] hover:to-[#654321] rounded-lg font-semibold transition-all shadow-lg shadow-[#A0522D]/30 text-white"
                  >
                    Create Custom Figure
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {figures.map((figure) => (
                  <FigureCard
                    key={figure.id}
                    figure={figure}
                    onStartDebate={() => handleSetupDebate()}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;