type TagProps = {
  label: string;
};

export default function Tag({ label }: TagProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.35em] text-slate-300">
      {label}
    </span>
  );
}
