import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listResources } from "../lib/api";
import type { Resource } from "../lib/api";

export default function Resources() {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listResources()
      .then(setResources)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page-wide">
      <h1>Rooms &amp; equipment</h1>
      <p className="sub">Browse what's available, then pick a time that works for you.</p>

      {error && <div className="form-error">{error}</div>}
      {!resources && !error && <p>Loading…</p>}
      {resources && resources.length === 0 && <p>Nothing's been added yet — check back soon.</p>}

      <div className="resource-grid">
        {resources?.map((r) => (
          <Link to={`/resources/${r.id}`} key={r.id} className="resource-card">
            <span className={`type-tag ${r.type}`}>{r.type}</span>
            <h2>{r.name}</h2>
            {r.description && <p>{r.description}</p>}
            {r.capacity && <p className="capacity">Capacity: {r.capacity}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
