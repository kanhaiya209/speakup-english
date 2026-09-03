import { useState, useId } from "react"

export const Meteors = ({ number = 15 }) => {
  const baseId = useId()
  const [meteors] = useState(() =>
    [...new Array(number)].map((_, i) => ({
      id: `${baseId}-${i}`,
      left: Math.floor(Math.random() * 100),
      delay: Math.random() * 4,
      duration: Math.floor(Math.random() * 4 + 3),
    }))
  )

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {meteors.map((m) => (
        <div
          key={m.id}
          style={{
            left: m.left + "%",
            top: "-10px",
            animationDelay: m.delay + "s",
            animationDuration: m.duration + "s",
          }}
          className="absolute w-px bg-gradient-to-b from-white via-white/50 to-transparent animate-meteor-fall"
        />
      ))}
      <style>{`
        @keyframes meteor-fall {
          0% { transform: translateY(-10px); opacity: 1; height: 60px; }
          100% { transform: translateY(100vh); opacity: 0; height: 60px; }
        }
        .animate-meteor-fall {
          animation: meteor-fall linear infinite;
        }
      `}</style>
    </div>
  )
}
