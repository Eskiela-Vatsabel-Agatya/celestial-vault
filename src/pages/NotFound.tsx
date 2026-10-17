import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  useEffect(() => { document.title = "Not found · Celestial Vault"; }, []);
  return (
    <div className="panel mx-auto max-w-md p-10 text-center">
      <h2 className="font-display text-3xl">Lost in the void</h2>
      <p className="mt-2 text-[var(--muted)]">There is no page at this address.</p>
      <Link className="btn btn-gold mt-5" to="/">Back to the vault</Link>
    </div>
  );
}
