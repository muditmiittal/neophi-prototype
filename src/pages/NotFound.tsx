import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="wrap notfound">
      <span className="stamp stamp-warn">Page not found</span>
      <h1>Nothing is saved at this address.</h1>
      <p className="muted">The link may be old, or mistyped. Neophi will not guess what you meant.</p>
      <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" to="/">
          Go to the home page
        </Link>
        <a className="btn" href="/app">
          Open the app
        </a>
      </p>
    </div>
  );
}
