import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props { children: ReactNode; resetKey: string }
interface State { failed: boolean }

/** Catches rendering errors so one broken page never blanks the whole site. Resets when the route changes. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("UI error:", error.message); }
  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="panel mx-auto max-w-md p-8 text-center" role="alert">
        <h2 className="font-display text-2xl">Something broke on this page</h2>
        <p className="mt-2 text-[var(--muted)]">Nothing was lost. Try reloading, or head back to the vault.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn btn-gold" onClick={() => window.location.reload()}>Reload</button>
          <Link className="btn" to="/" onClick={() => this.setState({ failed: false })}>Back to the vault</Link>
        </div>
      </div>
    );
  }
}
