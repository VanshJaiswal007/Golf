import { cookies } from 'next/headers';
import { currentUserFromCookieStore } from '../../lib/auth.js';
import { getDb } from '../../lib/db.js';
import { computeReports, latestScoresForUser, nextDrawDate } from '../../lib/core.js';

export default async function AdminPage({ searchParams }) {
  const cookieStore = await cookies();
  const user = currentUserFromCookieStore(cookieStore);
  const db = getDb();
  const msg = searchParams?.message || searchParams?.error;
  if (!user || user.role !== 'admin') {
    return (
      <main className="section card" style={{ maxWidth: 620, margin: '22px auto 0' }}>
        <h1 className="h2">Admin access</h1>
        <p className="muted">Sign in with the admin credentials to continue.</p>
        {msg ? <div className="notice" style={{ marginTop: 14 }}>{msg}</div> : null}
        <form action="/api/auth/login?next=/admin" method="post" className="form-stack" style={{ marginTop: 18 }}>
          <input name="email" type="email" placeholder="Admin email" required />
          <input name="password" type="password" placeholder="Admin password" required />
          <button type="submit">Sign in</button>
        </form>
      </main>
    );
  }

  const reports = computeReports(db);
  const latestDraft = [...db.draws].reverse().find((d) => d.status === 'draft');
  const latestPublished = [...db.draws].reverse().find((d) => d.status === 'published');
  const allWinners = [...db.winners].reverse();

  return (
    <main className="section stack">
      <div className="panel">
        <div className="inner">
          <div className="badge">Admin panel</div>
          <h1 className="h2" style={{ marginTop: 12 }}>Administration control</h1>
          <p className="muted">Manage users, subscriptions, scores, charities, draw logic, winner verification, and reports.</p>
          {msg ? <div className="notice" style={{ marginTop: 14 }}>{msg}</div> : null}
        </div>
      </div>

      <section className="columns-3">
        <div className="card soft"><div className="muted small">Total users</div><div className="kpi">{reports.totalUsers}</div></div>
        <div className="card soft"><div className="muted small">Active subscribers</div><div className="kpi">{reports.activeSubscribers}</div></div>
        <div className="card soft"><div className="muted small">Published draws</div><div className="kpi">{reports.publishedDraws}</div></div>
      </section>

      <section className="split">
        <div className="card">
          <h2 className="h2">Draw management</h2>
          <div className="muted small">Draw mode: {db.settings.drawMode}</div>
          <div className="muted small">Upcoming draw: {nextDrawDate().slice(0, 10)}</div>
          <form action="/api/admin/draws" method="post" className="form-stack" style={{ marginTop: 14 }}>
            <select name="mode" defaultValue={db.settings.drawMode || 'random'}>
              <option value="random">Random</option>
              <option value="algorithmic">Algorithmic</option>
            </select>
            <button name="action" value="simulate" type="submit">Simulate draw</button>
            <button name="action" value="publish" type="submit" className="secondary">Publish latest draft</button>
          </form>

          {latestDraft ? (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="badge">Latest draft</div>
              <div className="small muted" style={{ marginTop: 8 }}>Month: {latestDraft.month}</div>
              <div className="small muted">Numbers: {latestDraft.numbers.join(', ')}</div>
              <div className="small muted">Preview winners: {(latestDraft.preview?.projected || []).length}</div>
            </div>
          ) : <div className="muted" style={{ marginTop: 12 }}>No draft draw yet.</div>}

          {latestPublished ? (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="badge">Latest published</div>
              <div className="small muted" style={{ marginTop: 8 }}>Numbers: {latestPublished.numbers.join(', ')}</div>
              <div className="small muted">Winners: {latestPublished.winners || 0}</div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2 className="h2">Reports & analytics</h2>
          <table className="table">
            <tbody>
              <tr><td>Total prize pool</td><td>{reports.totalPrizePool}</td></tr>
              <tr><td>Charity contribution totals</td><td>{reports.totalCharity}</td></tr>
              <tr><td>Platform revenue</td><td>{db.settings.platformRevenue}</td></tr>
              <tr><td>Jackpot carry</td><td>{db.settings.jackpotCarry}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="split">
        <div className="card">
          <h2 className="h2">Charity management</h2>
          <form action="/api/admin/charities" method="post" className="form-stack">
            <input type="hidden" name="action" value="add" />
            <input name="name" placeholder="Charity name" required />
            <textarea name="description" placeholder="Description" rows="3" required />
            <input name="events" placeholder="Upcoming events" />
            <input name="imageUrl" placeholder="Image URL (optional)" />
            <label className="small muted"><input type="checkbox" name="spotlight" /> Spotlight on homepage</label>
            <button type="submit">Add charity</button>
          </form>

          <div className="stack" style={{ marginTop: 16 }}>
            {db.charities.map((c) => (
              <div key={c.id} className="card">
                <form action="/api/admin/charities" method="post" className="form-stack">
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} />
                  <textarea name="description" defaultValue={c.description} rows="2" />
                  <input name="events" defaultValue={c.events} />
                  <input name="imageUrl" defaultValue={c.imageUrl || ''} />
                  <label className="small muted"><input type="checkbox" name="spotlight" defaultChecked={c.spotlight} /> Spotlight</label>
                  <button type="submit" className="secondary">Update charity</button>
                </form>
                <form action="/api/admin/charities" method="post" style={{ marginTop: 10 }}>
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="danger">Delete charity</button>
                </form>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="h2">User management</h2>
          <div className="stack">
            {db.users.filter((u) => u.role === 'user').map((u) => {
              const scores = latestScoresForUser(db.scores, u.id, 5);
              return (
                <div key={u.id} className="card">
                  <form action="/api/admin/users" method="post" className="form-stack">
                    <input type="hidden" name="userId" value={u.id} />
                    <input name="name" defaultValue={u.name} />
                    <select name="subscriptionStatus" defaultValue={u.subscriptionStatus}>
                      <option value="inactive">Inactive</option>
                      <option value="active">Active</option>
                    </select>
                    <select name="subscriptionPlan" defaultValue={u.subscriptionPlan || 'monthly'}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <input name="charityContribution" type="number" min="10" max="100" defaultValue={u.charityContribution || 10} />
                    <button type="submit" className="secondary">Update user</button>
                  </form>
                  <div className="small muted" style={{ marginTop: 8 }}>Email: {u.email}</div>
                  <div className="small muted">Renewal: {u.renewalDate || '-'}</div>
                  <div className="small muted">Latest scores: {scores.map((s) => `${s.value} (${s.scoreDate})`).join(', ') || 'None'}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="h2">Winners management</h2>
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Match</th>
              <th>Amount</th>
              <th>Proof</th>
              <th>Payout</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allWinners.map((w) => {
              const winnerUser = db.users.find((u) => u.id === w.userId);
              return (
                <tr key={w.id}>
                  <td>{winnerUser?.name || w.userName || 'Unknown'}</td>
                  <td>{w.matchedCount}</td>
                  <td>{w.amount}</td>
                  <td>{w.proofStatus || 'pending'}</td>
                  <td>{w.paymentStatus || 'pending'}</td>
                  <td>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <form action="/api/admin/winners" method="post">
                        <input type="hidden" name="winnerId" value={w.id} />
                        <button name="action" value="approve" type="submit" className="secondary">Approve</button>
                      </form>
                      <form action="/api/admin/winners" method="post">
                        <input type="hidden" name="winnerId" value={w.id} />
                        <button name="action" value="reject" type="submit" className="secondary">Reject</button>
                      </form>
                      <form action="/api/admin/winners" method="post">
                        <input type="hidden" name="winnerId" value={w.id} />
                        <button name="action" value="paid" type="submit">Mark paid</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!allWinners.length ? <div className="muted" style={{ marginTop: 12 }}>No winners yet.</div> : null}
      </section>

      <form action="/api/auth/logout" method="post">
        <button className="secondary">Logout</button>
      </form>
    </main>
  );
}
