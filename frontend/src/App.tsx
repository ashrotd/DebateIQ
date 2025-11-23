import { useEffect, useState } from 'react'
import Header from './components/Header'
import FigureCard from './components/FigureCard'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'
import DebateArena from './components/DebateArena'
import DebateSetup from './components/DebateSetup'
import { Figure, BackendStatus } from './types'
import apiService from './services/api'

type AppView = 'selection' | 'setup' | 'debate';

interface DebateConfig {
  sessionId: string;
  topic: string;
  participants: string[];
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

  const handleStartDebate = async (topic: string, participants: string[], maxTurns: number) => {
    setCreatingDebate(true);
    setError(null);

    try {
      // Create debate session with Google ADK
      const response = await apiService.createDebate({
        topic,
        participants,
        max_turns: maxTurns
      });

      setDebateConfig({
        sessionId: response.session.session_id,
        topic: response.session.topic,
        participants: response.session.participants
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

  // Show debate arena if debate is active
  if (currentView === 'debate' && debateConfig) {
    return (
      <DebateArena
        sessionId={debateConfig.sessionId}
        topic={debateConfig.topic}
        participants={debateConfig.participants}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '700ms' }}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }}></div>
      </div>

      <div className="relative z-10">
        <Header backendStatus={backendStatus} />

        <main className="container mx-auto px-4 py-12">
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {creatingDebate && (
            <div className="text-center text-purple-300 mb-4">
              <LoadingSpinner />
              <p className="mt-4">Creating debate session...</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
                  Select Historical Figures for Your Debate
                </h1>
                <p className="text-slate-400 mb-6">
                  Choose your participants and let AI agents engage in an intellectual battle
                </p>
                <button
                  onClick={handleSetupDebate}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/30"
                >
                  Start New Debate
                </button>
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