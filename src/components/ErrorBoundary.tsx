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
      <div className="empty-state" role="alert">
        <h1 className="page-title">Something broke on this page</h1>
        <p className="mt-2 muted">Nothing was lost. Try reloading, or head back to the vault.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
          <Link className="btn" to="/" onClick={() => this.setState({ failed: false })}>Back to the vault</Link>
        </div>
      </div>
    );
  }
}
