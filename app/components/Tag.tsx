type TagProps = {
  label: string;
};

export default function Tag({ label }: TagProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.35em] text-utility">
      {label}
    </span>
  );
}
