export function BackgroundBeams({ className = "" }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="rg1" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rg2" cx="80%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rg3" cx="20%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#rg1)" />
        <rect width="100%" height="100%" fill="url(#rg2)" />
        <rect width="100%" height="100%" fill="url(#rg3)" />
        <line x1="400" y1="0" x2="0" y2="800" stroke="#6366f1" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="400" y1="0" x2="800" y2="800" stroke="#8b5cf6" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="400" y1="0" x2="200" y2="800" stroke="#06b6d4" strokeOpacity="0.08" strokeWidth="1" />
        <line x1="400" y1="0" x2="600" y2="800" stroke="#6366f1" strokeOpacity="0.08" strokeWidth="1" />
        <line x1="400" y1="0" x2="100" y2="800" stroke="#8b5cf6" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="400" y1="0" x2="700" y2="800" stroke="#06b6d4" strokeOpacity="0.06" strokeWidth="1" />
      </svg>
    </div>
  );
}
