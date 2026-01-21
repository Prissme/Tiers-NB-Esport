const particles = [
  { left: "8%", top: "15%", size: 2, delay: "0s", duration: "12s", opacity: 0.4 },
  { left: "18%", top: "65%", size: 1, delay: "2s", duration: "14s", opacity: 0.35 },
  { left: "28%", top: "35%", size: 2, delay: "4s", duration: "10s", opacity: 0.5 },
  { left: "40%", top: "20%", size: 1, delay: "1s", duration: "16s", opacity: 0.3 },
  { left: "52%", top: "52%", size: 2, delay: "3s", duration: "13s", opacity: 0.45 },
  { left: "62%", top: "28%", size: 1, delay: "6s", duration: "18s", opacity: 0.3 },
  { left: "70%", top: "70%", size: 2, delay: "5s", duration: "12s", opacity: 0.4 },
  { left: "82%", top: "22%", size: 1, delay: "2s", duration: "15s", opacity: 0.35 },
  { left: "90%", top: "55%", size: 2, delay: "7s", duration: "11s", opacity: 0.45 },
  { left: "12%", top: "85%", size: 1, delay: "3s", duration: "17s", opacity: 0.3 },
  { left: "32%", top: "80%", size: 2, delay: "6s", duration: "14s", opacity: 0.4 },
  { left: "44%", top: "62%", size: 1, delay: "5s", duration: "16s", opacity: 0.32 },
  { left: "56%", top: "18%", size: 2, delay: "1s", duration: "12s", opacity: 0.42 },
  { left: "66%", top: "38%", size: 1, delay: "4s", duration: "15s", opacity: 0.34 },
  { left: "76%", top: "48%", size: 2, delay: "8s", duration: "13s", opacity: 0.4 },
  { left: "86%", top: "78%", size: 1, delay: "2s", duration: "18s", opacity: 0.32 },
  { left: "6%", top: "45%", size: 2, delay: "7s", duration: "11s", opacity: 0.38 },
  { left: "22%", top: "5%", size: 1, delay: "9s", duration: "20s", opacity: 0.28 },
  { left: "48%", top: "10%", size: 2, delay: "3s", duration: "14s", opacity: 0.4 },
  { left: "94%", top: "32%", size: 1, delay: "6s", duration: "17s", opacity: 0.33 },
];

const ambienceImage =
  "https://media.discordapp.net/attachments/1434252768633290952/1463530397483929817/content.png?ex=69722a65&is=6970d8e5&hm=1603821cd11e19641f256399c4fc62a8f77ab412d02f7641da3d3051d3d9fb3b&=&format=webp&quality=lossless&width=874&height=583";

export default function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center opacity-[0.1] blur-[10px]"
        style={{ backgroundImage: `url(${ambienceImage})` }}
      />
      <div className="absolute inset-0 bg-[#05070d]/70" />
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
      </div>
    </div>
  );
}
