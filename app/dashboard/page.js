import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { currentUserFromCookieStore } from '../../lib/auth.js';
import { activeSubscription, computeDashboardStats, formatDate, formatDateTime, latestScoresForUser, nextDrawDate } from '../../lib/core.js';
import { getDb } from '../../lib/db.js';

export default async function DashboardPage({ searchParams }) {
  const cookieStore = await cookies();
  const user = currentUserFromCookieStore(cookieStore);
  if (!user) redirect('/login');

  const db = getDb();
  const stats = computeDashboardStats(db, user);
  const charities = db.charities;
  const selectedCharity = charities.find((c) => c.id === user.charityId);
  const subscriptionOk = activeSubscription(user);
  const scores = latestScoresForUser(db.scores, user.id, 5);
  const winners = db.winners.filter((w) => w.userId === user.id);
  const nextDraw = nextDrawDate();
  const msg = searchParams?.message || searchParams?.error;

  return (
    <main className="section stack">
      <div className="panel">
        <div className="inner">
          <div className="badge">User Dashboard</div>
          <h1 className="h2" style={{ marginTop: 12 }}>Welcome, {user.name}</h1>
          <p className="muted">Manage your subscription, charity, scores, participation, and winnings.</p>
          {msg ? <div className="notice" style={{ marginTop: 14 }}>{msg}</div> : null}
        </div>
      </div>

      <section className="columns-3">
        <div className="card soft">
          <div className="muted small">Subscription status</div>
          <div className="kpi">{subscriptionOk ? 'Active' : 'Inactive'}</div>
          <div className="small muted">Plan: {user.subscriptionPlan || '-'}</div>
          <div className="small muted">Renewal: {user.renewalDate ? formatDate(user.renewalDate) : '-'}</div>
        </div>
        <div className="card soft">
          <div className="muted small">Selected charity</div>
          <div className="kpi">{selectedCharity?.name || 'Not set'}</div>
          <div className="small muted">Contribution: {user.charityContribution || 10}%</div>
        </div>
        <div className="card soft">
          <div className="muted small">Participation summary</div>
          <div className="kpi">{stats.participatedDraws}</div>
          <div className="small muted">Upcoming draw: {formatDate(nextDraw)}</div>
        </div>
      </section>

      <section className="split">
        <div className="card">
          <h2 className="h2">Subscription flow</h2>
          <p className="muted">Choose the plan that fits, then select your charity and contribution percentage.</p>
          <form action="/api/subscription" method="post" className="form-stack" style={{ marginTop: 14 }}>
            <div className="form-row">
              <select name="plan" defaultValue={user.subscriptionPlan || 'monthly'}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <select name="charityId" defaultValue={user.charityId || ''}>
                <option value="">Select charity</option>
                {charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <input name="charityContribution" type="number" min="10" max="100" defaultValue={user.charityContribution || 10} />
            <button type="submit">Update subscription</button>
          </form>
        </div>

        <div className="card">
          <h2 className="h2">Score entry</h2>
          <p className="muted">Only the latest five Stableford scores are retained automatically.</p>
          {subscriptionOk ? (
            <form action="/api/scores" method="post" className="form-stack" style={{ marginTop: 14 }}>
              <input type="hidden" name="action" value="add" />
              <div className="form-row">
                <input name="value" type="number" min="1" max="45" placeholder="Score value (1-45)" required />
                <input name="scoreDate" type="date" required />
              </div>
              <button type="submit">Save score</button>
            </form>
          ) : (
            <div className="notice" style={{ marginTop: 14 }}>Activate a subscription to enter or edit scores.</div>
          )}

          <hr className="sep" />
          <div className="stack">
            {scores.length ? scores.map((s) => (
              <div key={s.id} className="card">
                <div className="small muted">Entered {formatDateTime(s.createdAt)}</div>
                <form action="/api/scores" method="post" className="form-row" style={{ marginTop: 10 }}>
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="id" value={s.id} />
                  <input name="value" type="number" min="1" max="45" defaultValue={s.value} />
                  <input name="scoreDate" type="date" defaultValue={s.scoreDate} />
                  <button type="submit" className="secondary">Update</button>
                </form>
                <form action="/api/scores" method="post" style={{ marginTop: 10 }}>
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="danger">Delete</button>
                </form>
              </div>
            )) : <div className="muted">No scores saved yet.</div>}
          </div>
        </div>
      </section>

      <section className="split">
        <div className="card">
          <h2 className="h2">Last five scores</h2>
          <table className="table">
            <thead>
              <tr><th>Score</th><th>Date</th></tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.id}>
                  <td>{s.value}</td>
                  <td>{formatDate(s.scoreDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!scores.length ? <div className="muted" style={{ marginTop: 12 }}>Latest five entries will appear here.</div> : null}
        </div>

        <div className="card">
          <h2 className="h2">Winnings overview</h2>
          <div className="kpi">{stats.totalWon}</div>
          <div className="small muted">Payment status: {stats.paidStatus}</div>
          <hr className="sep" />
          <div className="stack">
            {winners.length ? winners.map((w) => (
              <div key={w.id} className="card">
                <div className="badge">{w.matchedCount}-number match</div>
                <div className="small muted" style={{ marginTop: 8 }}>Amount: {w.amount}</div>
                <div className="small muted">Proof: {w.proofStatus || 'pending'}</div>
                <div className="small muted">Payout: {w.paymentStatus || 'pending'}</div>
                <div className="small muted">Draw: {w.drawId}</div>
                <form action="/api/winners" method="post" encType="multipart/form-data" className="form-stack" style={{ marginTop: 10 }}>
                  <input type="hidden" name="winnerId" value={w.id} />
                  <input name="note" placeholder="Proof note" />
                  <input name="proofFile" type="file" />
                  <button type="submit" className="secondary">Upload proof</button>
                </form>
              </div>
            )) : <div className="muted">No winnings yet.</div>}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="h2">Charity directory</h2>
        <div className="columns-3">
          {charities.map((c) => (
            <div key={c.id} className="card">
              <div className="badge">{c.spotlight ? 'Featured' : 'Charity'}</div>
              <h3 className="h3">{c.name}</h3>
              <p className="muted">{c.description}</p>
              <div className="small muted">Events: {c.events}</div>
              <form action="/api/charity" method="post" className="form-stack" style={{ marginTop: 12 }}>
                <input type="hidden" name="charityId" value={c.id} />
                <input type="number" name="charityContribution" min="10" max="100" defaultValue={user.charityContribution || 10} />
                <button type="submit" className="secondary">Select charity</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <form action="/api/auth/logout" method="post">
        <button className="secondary">Logout</button>
      </form>
    </main>
  );
}
