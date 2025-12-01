export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-20 h-20">
      
        <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
      
        <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
        
        <div className="absolute inset-2 border-4 border-transparent border-t-pink-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
      </div>
      <p className="text-white mt-6 text-lg font-medium">Loading historical figures...</p>
      <p className="text-slate-400 text-sm mt-2">Preparing the arena</p>
    </div>
  );
}