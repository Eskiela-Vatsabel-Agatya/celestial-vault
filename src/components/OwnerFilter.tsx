import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { Member } from "../lib/types";
import Popover from "./Popover";

interface Props { members: Member[]; selected: string[]; onChange: (ids: string[]) => void }

/** Searchable multi-select for owners: players first (A to Z), then the two labels. */
export default function OwnerFilter({ members, selected, onChange }: Props) {
  const [q, setQ] = useState("");
  const options = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members
      .filter((m) => !needle || `${m.displayName} ${m.minecraftIgn ?? ""} ${m.altIgn ?? ""}`.toLowerCase().includes(needle))
      .sort((a, b) => (a.kind === b.kind ? a.displayName.localeCompare(b.displayName) : a.kind === "player" ? -1 : 1));
  }, [members, q]);

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((o) => o !== id) : [...selected, id]);

  return (
    <Popover
      buttonClassName="field-btn"
      label={<>Owner {selected.length > 0 && <span className="count-badge" aria-label={`${selected.length} selected`}>{selected.length}</span>}<ChevronDown size={16} aria-hidden="true" /></>}
    >
      <div style={{ width: 280, maxWidth: "100%" }}>
        <label htmlFor="owner-search" className="sr-only">Search owners</label>
        <div className="field-shell">
          <Search size={16} aria-hidden="true" />
          <input id="owner-search" type="text" autoComplete="off" placeholder="Search name or IGN" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="option-list" aria-label="Owners">
          {options.map((m) => (
            <li key={m.id}>
              <label className="check-row">
                <input type="checkbox" className="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                <span className="check-grow" style={m.kind === "label" ? { fontStyle: "italic", color: "var(--text-muted)" } : undefined}>
                  {m.displayName}{m.archived ? " (former)" : ""}
                </span>
                {m.kind === "player" && <span className="label-sm">{m.minecraftIgn ?? "IGN not set"}</span>}
              </label>
            </li>
          ))}
          {options.length === 0 && <li className="label-sm" style={{ padding: "8px" }}>No matches</li>}
        </ul>
      </div>
    </Popover>
  );
}
