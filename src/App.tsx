import { NavLink, Route, Routes } from "react-router-dom";
import { Star } from "lucide-react";
import { DataProvider, useInventory } from "./components/DataContext";
import { relativeTime } from "./lib/format";
import Explorer from "./pages/Explorer";
import Members from "./pages/Members";
import NotFound from "./pages/NotFound";

// Later phases add Dashboard, Rules and Manage here.
const NAV = [
  { to: "/", label: "Vault", end: true },
  { to: "/members", label: "Members", end: false },
];

function Footer() {
  const { data } = useInventory();
  return (
    <footer className="mt-12 border-t border-[var(--line)] py-6 text-center text-sm text-[var(--muted)]">
      <p>Celestial [Bliss] · ChillSMP</p>
      {data && <p className="mt-1">Data updated {relativeTime(data.generatedAt)}</p>}
    </footer>
  );
}

export default function App() {
  return (
    <DataProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-[var(--gold)] focus:px-3 focus:py-1 focus:text-black">Skip to content</a>
      <div className="mx-auto max-w-6xl px-4">
        <header className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <h1 className="font-display flex items-center gap-2 text-3xl" style={{ color: "var(--gold)" }}>
              <Star size={22} fill="currentColor" aria-hidden="true" /> Celestial Vault
            </h1>
            <p className="text-sm text-[var(--muted)]">Everything the guild keeps, and who it belongs to.</p>
          </div>
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-[var(--gold-soft)] text-[var(--gold)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
                {n.label}
              </NavLink>
            ))}
            {/* Reserved slot for the Phase 2 "Editor login" button */}
            <span id="header-right-slot" />
          </nav>
        </header>
        <main id="main">
          <Routes>
            <Route path="/" element={<Explorer />} />
            <Route path="/members" element={<Members />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </DataProvider>
  );
}
