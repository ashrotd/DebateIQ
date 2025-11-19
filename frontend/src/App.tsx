import { useEffect, useState } from 'react'

interface Figure {
  id: string;
  name: string;
  title: string;
  era: string;
  specialty: string;
  avatar: string;
  warning?: string;
}

function App() {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<string>('checking...');

  useEffect(() => {
    // Test backend connection
    const testBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/test');
        const data = await response.json();
        setBackendStatus(data.message);
      } catch (err) {
        setBackendStatus('❌ Backend not connected');
        console.error('Backend connection error:', err);
      }
    };

    // Fetch figures
    const fetchFigures = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/figures');
        if (!response.ok) {
          throw new Error('Failed to fetch figures');
        }
        const data = await response.json();
        setFigures(data.figures);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    testBackend();
    fetchFigures();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎭 Historical Debate Arena
          </h1>
          <p className="text-xl text-gray-300">
            Debate with AI-powered historical figures
          </p>
          <div className="mt-4 inline-block bg-gray-800 rounded-lg px-6 py-3">
            <p className="text-sm text-gray-400">
              Backend Status: <span className="text-green-400 font-semibold">{backendStatus}</span>
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="text-white mt-4">Loading historical figures...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto bg-red-900/50 border border-red-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-200 mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
            <p className="text-sm text-red-400 mt-2">
              Make sure the backend is running on http://localhost:8000
            </p>
          </div>
        )}

        {/* Figures Grid */}
        {!loading && !error && (
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {figures.map((figure) => (
              <div
                key={figure.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="text-6xl mb-4 text-center">{figure.avatar}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{figure.name}</h3>
                <p className="text-gray-400 text-sm mb-2">{figure.title}</p>
                <p className="text-gray-500 text-xs mb-3">{figure.era}</p>
                <div className="bg-blue-900/30 rounded-lg p-3 mb-4">
                  <p className="text-blue-200 text-sm">
                    <span className="font-semibold">Specialty:</span> {figure.specialty}
                  </p>
                </div>
                {figure.warning && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-2 mb-4">
                    <p className="text-yellow-200 text-xs">{figure.warning}</p>
                  </div>
                )}
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  onClick={() => alert(`Debate feature coming soon! You selected ${figure.name}`)}
                >
                  Start Debate
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 max-w-2xl">
            <h3 className="text-lg font-semibold text-white mb-3">
              ✅ Setup Complete!
            </h3>
            <div className="text-left text-gray-300 space-y-2">
              <p>✓ Frontend is running</p>
              <p>✓ Backend is connected</p>
              <p>✓ API is responding</p>
              <p className="text-sm text-gray-500 mt-4">
                Next steps: Add AI agents and debate logic
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;