export default function RegisterPage({ searchParams }) {
  const error = searchParams?.error;
  return (
    <main className="section card" style={{ maxWidth: 620, margin: '22px auto 0' }}>
      <h1 className="h2">Register</h1>
      <p className="muted">Create a subscriber account. Your access becomes active after you subscribe.</p>
      {error ? <div className="notice" style={{ marginTop: 14 }}>{error}</div> : null}
      <form action="/api/auth/register" method="post" className="form-stack" style={{ marginTop: 18 }}>
        <input name="name" placeholder="Full name" required />
        <input name="email" type="email" placeholder="Email address" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Create account</button>
      </form>
      <div className="muted small" style={{ marginTop: 12 }}>
        Already registered? <a href="/login">Login</a>
      </div>
    </main>
  );
}
