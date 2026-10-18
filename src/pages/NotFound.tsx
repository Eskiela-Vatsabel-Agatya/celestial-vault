import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  useEffect(() => { document.title = "Not found · Celestial Vault"; }, []);
  return (
    <div className="empty-state">
      <h1 className="page-title">Lost in the void</h1>
      <p className="mt-2 muted">There is no page at this address.</p>
      <Link className="btn btn-primary mt-6" to="/">Back to the vault</Link>
    </div>
  );
}
