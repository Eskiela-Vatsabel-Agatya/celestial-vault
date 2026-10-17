import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Star } from "lucide-react";
import { DataProvider } from "./components/DataContext";
import { RecentProvider, useRecent } from "./components/RecentContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { EditorProvider, useEditor } from "./components/EditorContext";
import { AdminProvider } from "./components/AdminContext";
import { ItemActionsProvider } from "./components/ItemActions";
import { ToastProvider } from "./components/Toasts";
import HeaderAuth from "./components/HeaderAuth";
import LoginModal from "./components/LoginModal";
import { relativeTime } from "./lib/format";
import Explorer from "./pages/Explorer";
import Members from "./pages/Members";
import Manage from "./pages/Manage";
import Dashboard from "./pages/Dashboard";
import Rules from "./pages/Rules";
import NotFound from "./pages/NotFound";

// `editorOnly` links only show while signed in.
const NAV = [
  { to: "/", label: "Vault", end: true, editorOnly: false },
  { to: "/dashboard", label: "Dashboard", end: false, editorOnly: false },
  { to: "/members", label: "Members", end: false, editorOnly: false },
  { to: "/rules", label: "Rules", end: false, editorOnly: false },
  { to: "/manage", label: "Manage", end: false, editorOnly: true },
];

function Nav() {
  const { editor } = useEditor();
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
      {NAV.filter((n) => !n.editorOnly || editor).map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end}
          className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-[var(--gold-soft)] text-[var(--gold)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
          {n.label}
        </NavLink>
      ))}
      <HeaderAuth />
    </nav>
  );
}

function Footer() {
  const { changes } = useRecent();
  const newest = changes && changes.length ? changes[0].at : null;
  return (
    <footer className="mt-12 border-t border-[var(--line)] py-6 text-center text-sm text-[var(--muted)]">
      <p>Celestial [Bliss] · ChillSMP</p>
      <p className="mt-1">Java: <code className="rounded bg-black/30 px-1.5 py-0.5 text-[var(--ink)]">play.chillsmp.org</code> · Bedrock: same address, port <code className="rounded bg-black/30 px-1.5 py-0.5 text-[var(--ink)]">19132</code></p>
      {newest && <p className="mt-1">Last updated <time dateTime={newest} title={new Date(newest).toLocaleString()}>{relativeTime(newest)}</time></p>}
    </footer>
  );
}

/** Routes inside an error boundary; the boundary resets and the page fades in on every navigation. */
function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <div key={pathname} className="page-enter">
        <Routes>
          <Route path="/" element={<Explorer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

function LoginHost() {
  const { loginOpen } = useEditor();
  return loginOpen ? <LoginModal /> : null;
}

export default function App() {
  return (
    <ToastProvider>
      <EditorProvider>
        <DataProvider>
          <RecentProvider>
          <AdminProvider>
            <ItemActionsProvider>
              <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-[var(--gold)] focus:px-3 focus:py-1 focus:text-black">Skip to content</a>
              <div className="mx-auto max-w-6xl px-4">
                <header className="flex flex-wrap items-center justify-between gap-3 py-5">
                  <div>
                    <h1 className="font-display flex items-center gap-2 text-3xl" style={{ color: "var(--gold)" }}>
                      <Star size={22} fill="currentColor" aria-hidden="true" /> Celestial Vault
                    </h1>
                    <p className="text-sm text-[var(--muted)]">Everything the guild keeps, and who it belongs to.</p>
                  </div>
                  <Nav />
                </header>
                <main id="main">
                  <AppRoutes />
                </main>
                <Footer />
              </div>
              <LoginHost />
            </ItemActionsProvider>
          </AdminProvider>
          </RecentProvider>
        </DataProvider>
      </EditorProvider>
    </ToastProvider>
  );
}
