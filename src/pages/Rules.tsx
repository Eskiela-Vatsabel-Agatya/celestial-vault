import { useEffect } from "react";
import { RULES, RULES_TITLE } from "../content/rules";

/** Editorial reading page: one column, hairlines between sections, no boxes. */
export default function Rules() {
  useEffect(() => { document.title = "Rules · Celestial Vault"; }, []);
  return (
    <div className="prose-page">
      <div className="page-head"><h1 className="page-title">{RULES_TITLE}</h1></div>
      {RULES.map((s) => (
        <section key={s.id} aria-labelledby={`rule-${s.id}`} className="rule-section">
          <h2 id={`rule-${s.id}`} className="section-h">{s.title}</h2>
          {s.bullets && <ul className="rule-list" style={{ listStyle: "disc" }}>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          {s.steps && <ol className="rule-list" style={{ listStyle: "decimal" }}>{s.steps.map((b) => <li key={b}>{b}</li>)}</ol>}
          {s.text && <p className="mt-3">{s.text}</p>}
          {s.aside && <p className="mt-3 text-sm muted">{s.aside}</p>}
          {s.note && <p className="mt-2 text-sm muted" style={{ fontStyle: "italic" }}>{s.note}</p>}
        </section>
      ))}
    </div>
  );
}
