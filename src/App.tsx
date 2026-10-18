import { useRef } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { DataProvider } from "./components/DataContext";
import { RecentProvider, useRecent } from "./components/RecentContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { EditorProvider, useEditor } from "./components/EditorContext";
import { AdminProvider } from "./components/AdminContext";
import { ItemActionsProvider } from "./components/ItemActions";
import { ToastProvider } from "./components/Toasts";
import { ThemeToggle } from "./components/ThemeContext";
import HeaderAuth from "./components/HeaderAuth";
import LoginModal from "./components/LoginModal";
import { relativeTime } from "./lib/format";
import { useScrollFade } from "./lib/useScrollFade";
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

function Header() {
  const { editor } = useEditor();
  const nav = useRef<HTMLElement>(null);
  useScrollFade(nav);
  return (
    <header className="header-inner">
      <div className="header-grid">
        <Link to="/" className="brand">
          {/* The logo is an <img> (not inlined) so its gradient ids can't collide with anything else. */}
          <img src="/favicon.svg" width={32} height={32} alt="" />
          <span className="wordmark">Celestial Vault</span>
        </Link>
        <nav ref={nav} aria-label="Main" className="site-nav">
          {NAV.filter((n) => !n.editorOnly || editor).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">{n.label}</NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { changes } = useRecent();
  const newest = changes && changes.length ? changes[0].at : null;
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <p>Celestial [Bliss] · ChillSMP</p>
        <p>Java: <code className="code-tag">play.chillsmp.org</code> · Bedrock: same address, port <code className="code-tag">19132</code></p>
        {newest && <p>Last updated <time dateTime={newest} title={new Date(newest).toLocaleString()}>{relativeTime(newest)}</time></p>}
      </div>
    </footer>
  );
}

/** Routes inside an error boundary that resets on every navigation. */
function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Routes>
        <Route path="/" element={<Explorer />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
                <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn btn-primary">Skip to content</a>
                <div className="container-cv">
                  <Header />
                  <main id="main" className="pt-8">
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
