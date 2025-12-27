import { rulebook } from "../lib/lfn-data";

const renderBold = (text) => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong key={`${chunk}-${index}`} className="font-semibold text-white">
          {chunk.replace(/\*\*/g, "")}
        </strong>
      );
    }
    return <span key={`${chunk}-${index}`}>{chunk}</span>;
  });
};

export default function RulebookPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-frost">
          League Operations
        </p>
        <h1 className="text-4xl font-semibold text-white">LFN Rulebook</h1>
        <p className="max-w-3xl text-frost">
          Quick-reference rules to keep matchdays clean, fair, and
          schedule-friendly. Highlighted keywords help you scan the details
          fast.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {rulebook.format.map((section) => (
          <section key={section.title} className="glass-panel p-6">
            <h2 className="section-title">{section.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-frost">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-pulse" />
                  <span>{renderBold(item)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
