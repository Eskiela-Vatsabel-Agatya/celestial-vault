import { useEffect } from "react";
import { ScrollText, Gavel, PackageCheck, PenLine, type LucideIcon } from "lucide-react";
import { RULES, RULES_TITLE, type RuleIcon } from "../content/rules";

const ICONS: Record<RuleIcon, LucideIcon> = { scroll: ScrollText, gavel: Gavel, package: PackageCheck, pen: PenLine };
const ACCENT: Record<RuleIcon, string> = { scroll: "var(--accent-text)", gavel: "var(--danger-text)", package: "var(--success-text)", pen: "var(--gold-text)" };

export default function Rules() {
  useEffect(() => { document.title = "Rules · Celestial Vault"; }, []);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display mb-4 text-2xl">{RULES_TITLE}</h1>
      <div className="space-y-4">
        {RULES.map((s) => {
          const Icon = ICONS[s.icon], accent = ACCENT[s.icon];
          return (
            <section key={s.id} aria-labelledby={`rule-${s.id}`} className="panel p-5" style={{ borderTop: `3px solid ${accent}` }}>
              <h3 id={`rule-${s.id}`} className="font-display flex items-center gap-2 text-lg tracking-wider" style={{ color: accent }}>
                <Icon size={20} aria-hidden="true" /> {s.title}
              </h3>
              {s.bullets && (
                <ul className="mt-3 space-y-2 leading-relaxed">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2"><span aria-hidden="true" style={{ color: accent }}>•</span><span>{b}</span></li>
                  ))}
                </ul>
              )}
              {s.steps && (
                <ol className="mt-3 list-decimal space-y-2 pl-6 leading-relaxed marker:text-[var(--gold)]">
                  {s.steps.map((b) => <li key={b}>{b}</li>)}
                </ol>
              )}
              {s.text && <p className="mt-3 leading-relaxed">{s.text}</p>}
              {s.aside && <p className="mt-3 text-sm text-[var(--muted)]">{s.aside}</p>}
              {s.note && <p className="mt-2 text-sm italic text-[var(--muted)]">{s.note}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
