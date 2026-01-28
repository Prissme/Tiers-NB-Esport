export default function Footer() {
  return (
    <footer className="relative z-10 bg-[#070a12]/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 text-sm text-utility sm:px-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
              <img
                src="https://media.discordapp.net/attachments/1434252768633290952/1466093575224819904/image-Photoroom_12.png?ex=697b7d8b&is=697a2c0b&hm=3f3526437b32284f06c2f7d7dbf88515ebcb54692246eca72b8540ab26f35038&=&format=webp&quality=lossless&width=331&height=325"
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
