import React, { useEffect, useState } from 'react';

const Confetti = () => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    const arr = [];
    for (let i = 0; i < 85; i++) {
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * -20 - 10,
        size: Math.random() * 8 + 4,
        color: ['#3B82F6', '#60A5FA', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'][Math.floor(Math.random() * 6)],
        delay: Math.random() * 2.5,
        duration: Math.random() * 2 + 2,
        rotation: Math.random() * 360,
      });
    }
    setParticles(arr);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm opacity-90"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animation: `fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Confetti;
