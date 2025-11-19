import { useEffect, useState } from 'react'
import Header from './components/Header'
import FigureCard from './components/FigureCard'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'
import { Figure, BackendStatus } from './types'
import apiService from './services/api'

function App() {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

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

  const handleStartDebate = (figureId: string) => {
    alert(`Debate feature coming soon! You selected ${figureId}`);
  };

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
          
          {!loading && !error && (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {figures.map((figure) => (
                <FigureCard
                  key={figure.id}
                  figure={figure}
                  onStartDebate={handleStartDebate}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;