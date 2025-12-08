import React, { useEffect, useState } from 'react';

const Snowfall: React.FC = () => {
  const [flakes, setFlakes] = useState<number[]>([]);

  useEffect(() => {
    // Generate static flakes to avoid constant re-renders causing perf issues
    setFlakes(Array.from({ length: 50 }, (_, i) => i));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {flakes.map((i) => {
        const left = Math.random() * 100;
        const duration = 5 + Math.random() * 10;
        const delay = Math.random() * 5;
        
        return (
          <div
            key={i}
            className="absolute top-[-10px] text-white opacity-60"
            style={{
              left: `${left}%`,
              animation: `fall ${duration}s linear ${delay}s infinite`,
              fontSize: `${Math.random() * 10 + 10}px`
            }}
          >
            ❄
          </div>
        );
      })}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) translateX(0px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(110vh) translateX(20px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Snowfall;