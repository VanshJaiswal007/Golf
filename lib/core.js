export const MONTHLY_PRICE = 499;
export const YEARLY_PRICE = 4999;
export const PRIZE_POOL_RATE = 0.25;
export const CHARITY_MIN_RATE = 0.10;
export const DEFAULT_ADMIN_EMAIL = 'admin@golfcharity.local';
export const DEFAULT_ADMIN_PASSWORD = 'Charity@12345';

export function nowISO() {
  return new Date().toISOString();
}

export function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function nextDrawDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function makeId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function hashCounts(values) {
  const counts = new Map();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return counts;
}

export function latestScoresForUser(scores, userId, limit = 5) {
  return scores
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.scoreDate) - new Date(a.scoreDate) || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

export function enforceRollingFive(scores, userId) {
  const userScores = scores.filter((s) => s.userId === userId).sort((a, b) => new Date(b.scoreDate) - new Date(a.scoreDate) || new Date(b.createdAt) - new Date(a.createdAt));
  return userScores.slice(0, 5);
}

export function scoreSet(scores) {
  return new Set(scores.map((s) => toNumber(s.value)));
}

export function countMatches(userScores, drawNumbers) {
  const a = scoreSet(userScores);
  const b = new Set(drawNumbers.map((n) => toNumber(n)));
  let matches = 0;
  for (const n of a) if (b.has(n)) matches += 1;
  return matches;
}

export function randomUniqueNumbers(count, min = 1, max = 45) {
  const pool = [];
  for (let i = min; i <= max; i++) pool.push(i);
  const result = [];
  while (result.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result.sort((a, b) => a - b);
}

export function weightedDrawNumbers(scores, count = 5) {
  const counts = new Map();
  for (const s of scores) {
    const n = toNumber(s.value);
    if (n >= 1 && n <= 45) counts.set(n, (counts.get(n) || 0) + 1);
  }
  const pool = [];
  for (let i = 1; i <= 45; i++) {
    const weight = (counts.get(i) || 0) + 1;
    for (let j = 0; j < weight; j++) pool.push(i);
  }
  const picked = new Set();
  while (picked.size < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.add(pool.splice(idx, 1)[0]);
  }
  while (picked.size < count) {
    picked.add(Math.floor(Math.random() * 45) + 1);
  }
  return [...picked].sort((a, b) => a - b);
}

export function buildTierPools(prizePoolBalance) {
  return {
    tier5: Math.round(prizePoolBalance * 0.4),
    tier4: Math.round(prizePoolBalance * 0.35),
    tier3: Math.round(prizePoolBalance * 0.25),
  };
}

export function planPrice(plan) {
  return plan === 'yearly' ? YEARLY_PRICE : MONTHLY_PRICE;
}

export function renewalDateFor(plan) {
  const d = new Date();
  d.setDate(d.getDate() + (plan === 'yearly' ? 365 : 30));
  return d.toISOString();
}

export function computePrizeContribution(plan) {
  return Math.round(planPrice(plan) * PRIZE_POOL_RATE);
}

export function computeCharityContribution(plan, percent) {
  return Math.round(planPrice(plan) * clamp(percent, CHARITY_MIN_RATE * 100, 100) / 100);
}

export function activeSubscription(user) {
  if (!user) return false;
  if (user.subscriptionStatus !== 'active') return false;
  const renewal = user.renewalDate ? new Date(user.renewalDate) : null;
  if (renewal && renewal.getTime() < Date.now()) return false;
  return true;
}

export function safeInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function sum(list, mapper = (x) => x) {
  return list.reduce((acc, item) => acc + toNumber(mapper(item), 0), 0);
}

export function drawMatchesSummary(drawNumbers, userScores) {
  const set = new Set(drawNumbers);
  return userScores.filter((s) => set.has(toNumber(s.value))).length;
}

export function computeDashboardStats(db, user) {
  const userScores = latestScoresForUser(db.scores, user.id, 5);
  const winnings = db.winners.filter((w) => w.userId === user.id);
  const upcomingDraw = nextDrawDate();
  const totalWon = sum(winnings, (w) => w.amount);
  const paidStatus = winnings.length ? (winnings.every((w) => w.paymentStatus === 'paid') ? 'Paid' : 'Pending') : 'None yet';
  const participatedDraws = db.draws.filter((d) => d.status === 'published').length;
  return {
    userScores,
    winnings,
    upcomingDraw,
    totalWon,
    paidStatus,
    participatedDraws,
  };
}

export function computeReports(db) {
  const totalUsers = db.users.filter((u) => u.role === 'user').length;
  const activeSubscribers = db.users.filter((u) => u.role === 'user' && activeSubscription(u)).length;
  const totalPrizePool = db.settings.prizePoolBalance;
  const totalCharity = db.settings.charityFundTotal;
  const publishedDraws = db.draws.filter((d) => d.status === 'published').length;
  return { totalUsers, activeSubscribers, totalPrizePool, totalCharity, publishedDraws };
}

export function userDisplayName(user) {
  return user?.name || user?.email || 'Guest';
}
