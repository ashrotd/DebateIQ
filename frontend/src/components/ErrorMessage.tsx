interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-red-900/20 backdrop-blur-sm border border-red-500/50 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-red-200 mb-2">
              Connection Error
            </h3>
            <p className="text-red-300 mb-4">{message}</p>
            <div className="bg-red-950/50 rounded-lg p-4 border border-red-800/50">
              <p className="text-sm text-red-400 mb-2">
                <strong>Troubleshooting:</strong>
              </p>
              <ul className="text-sm text-red-300 space-y-1 list-disc list-inside">
                <li>Make sure the backend is running on http://localhost:8000</li>
                <li>Check Docker containers: <code className="bg-red-900/50 px-2 py-0.5 rounded">docker-compose ps</code></li>
                <li>View backend logs: <code className="bg-red-900/50 px-2 py-0.5 rounded">docker-compose logs backend</code></li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}