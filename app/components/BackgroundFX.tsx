const particles = [
  { left: "8%", top: "15%", size: 3, delay: "0s", duration: "12s", opacity: 0.4 },
  { left: "18%", top: "65%", size: 2, delay: "2s", duration: "14s", opacity: 0.35 },
  { left: "28%", top: "35%", size: 3, delay: "4s", duration: "10s", opacity: 0.5 },
  { left: "40%", top: "20%", size: 2, delay: "1s", duration: "16s", opacity: 0.3 },
  { left: "52%", top: "52%", size: 3, delay: "3s", duration: "13s", opacity: 0.45 },
  { left: "62%", top: "28%", size: 2, delay: "6s", duration: "18s", opacity: 0.3 },
  { left: "70%", top: "70%", size: 3, delay: "5s", duration: "12s", opacity: 0.4 },
  { left: "82%", top: "22%", size: 2, delay: "2s", duration: "15s", opacity: 0.35 },
  { left: "90%", top: "55%", size: 3, delay: "7s", duration: "11s", opacity: 0.45 },
  { left: "12%", top: "85%", size: 2, delay: "3s", duration: "17s", opacity: 0.3 },
  { left: "32%", top: "80%", size: 3, delay: "6s", duration: "14s", opacity: 0.4 },
  { left: "44%", top: "62%", size: 2, delay: "5s", duration: "16s", opacity: 0.32 },
  { left: "56%", top: "18%", size: 3, delay: "1s", duration: "12s", opacity: 0.42 },
  { left: "66%", top: "38%", size: 2, delay: "4s", duration: "15s", opacity: 0.34 },
  { left: "76%", top: "48%", size: 3, delay: "8s", duration: "13s", opacity: 0.4 },
  { left: "86%", top: "78%", size: 2, delay: "2s", duration: "18s", opacity: 0.32 },
  { left: "6%", top: "45%", size: 3, delay: "7s", duration: "11s", opacity: 0.38 },
  { left: "22%", top: "5%", size: 2, delay: "9s", duration: "20s", opacity: 0.28 },
  { left: "48%", top: "10%", size: 3, delay: "3s", duration: "14s", opacity: 0.4 },
  { left: "94%", top: "32%", size: 2, delay: "6s", duration: "17s", opacity: 0.33 },
];

const glowParticles = [
  { left: "14%", top: "22%", size: 6, delay: "1s", duration: "22s", opacity: 0.25 },
  { left: "26%", top: "58%", size: 8, delay: "4s", duration: "26s", opacity: 0.22 },
  { left: "38%", top: "40%", size: 7, delay: "2s", duration: "24s", opacity: 0.28 },
  { left: "58%", top: "18%", size: 9, delay: "6s", duration: "28s", opacity: 0.2 },
  { left: "72%", top: "62%", size: 7, delay: "3s", duration: "25s", opacity: 0.26 },
  { left: "86%", top: "30%", size: 6, delay: "5s", duration: "23s", opacity: 0.24 },
  { left: "10%", top: "78%", size: 8, delay: "7s", duration: "27s", opacity: 0.2 },
];

export default function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0 bg-[#05070d]/20" />
      <div className="absolute inset-0 bg-vignette" />
      <div className="absolute inset-0 bg-noise opacity-70" />
      <div className="absolute left-1/2 top-[260px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-halo blur-[120px]" />
      <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-cyan/10 blur-[120px]" />
      <div className="absolute right-[-120px] top-24 h-80 w-80 rounded-full bg-slate-500/10 blur-[140px]" />
      <div className="particle-field">
        {particles.map((particle, index) => (
          <span
            key={`particle-${index}`}
            className="particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              opacity: particle.opacity,
            }}
          />
        ))}
        {glowParticles.map((particle, index) => (
          <span
            key={`particle-glow-${index}`}
            className="particle particle--glow"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              opacity: particle.opacity,
            }}
          />
        ))}
      </div>
    </div>
  );
}
