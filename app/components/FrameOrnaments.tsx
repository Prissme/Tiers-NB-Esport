type FrameOrnamentsProps = {
  label?: string;
};

export default function FrameOrnaments({ label = "STEP INTO THE" }: FrameOrnamentsProps) {
  return (
    <div className="frame-ornaments" aria-hidden="true">
      <div className="frame-ornaments__outer" />
      <div className="frame-ornaments__inner" />
      <span className="frame-ornaments__corner frame-ornaments__corner--tl" />
      <span className="frame-ornaments__corner frame-ornaments__corner--tr" />
      <span className="frame-ornaments__corner frame-ornaments__corner--bl" />
      <span className="frame-ornaments__corner frame-ornaments__corner--br" />
      <span className="frame-ornaments__tick frame-ornaments__tick--top" />
      <span className="frame-ornaments__tick frame-ornaments__tick--bottom" />
      <span className="frame-ornaments__tick frame-ornaments__tick--left" />
      <span className="frame-ornaments__tick frame-ornaments__tick--right" />
      <span className="frame-ornaments__label">{label}</span>
    </div>
  );
}
