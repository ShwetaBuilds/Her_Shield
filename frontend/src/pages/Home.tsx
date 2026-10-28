import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="app-shell">
      <section>
        <h1>Her Shield</h1>
        <p>Secure safety features for women on the go.</p>
        <div className="actions">
          <Link to="/signup">Sign Up</Link>
          <Link to="/login">Log In</Link>
        </div>
      </section>
    </main>
  );
}
