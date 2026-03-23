export default function LoginPage({ searchParams }) {
  const error = searchParams?.error;
  return (
    <main className="section card" style={{ maxWidth: 620, margin: '22px auto 0' }}>
      <h1 className="h2">Login</h1>
      <p className="muted">Use your account credentials to continue.</p>
      {error ? <div className="notice" style={{ marginTop: 14 }}>{error}</div> : null}
      <form action="/api/auth/login" method="post" className="form-stack" style={{ marginTop: 18 }}>
        <input name="email" type="email" placeholder="Email address" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Sign in</button>
      </form>
      <div className="muted small" style={{ marginTop: 12 }}>
        Need an account? <a href="/register">Register</a>
      </div>
    </main>
  );
}
