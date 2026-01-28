export default function Footer() {
  return (
    <footer className="relative z-10 bg-[#070a12]/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 text-sm text-utility sm:px-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
              <img
                src="https://media.discordapp.net/attachments/1434252768633290952/1466080774112542762/image-Photoroom_10.png?ex=697b719f&is=697a201f&hm=c44af05e9f6a24a3462c0f0f85d19f7141bc84f5a2a1a8a03bd3a3b838c055f3&=&format=webp&quality=lossless&width=236&height=236"
                alt="Logo LFN"
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </span>
          </div>
          <p className="text-xs text-utility">
            © {new Date().getFullYear()} LFN. Tous droits réservés.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em]">
          <a
            href="/reglement"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            Règlement
          </a>
          <a
            href="/matchs"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            Matchs
          </a>
          <a
            href="/classement"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]"
          >
            Classement
          </a>
        </div>
      </div>
    </footer>
  );
}
