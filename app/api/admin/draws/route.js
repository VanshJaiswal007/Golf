export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getDb, getSessionUser, saveDb } from '../../../../lib/db.js';
import { buildTierPools, countMatches, makeId, monthKey, randomUniqueNumbers, weightedDrawNumbers, latestScoresForUser, sum } from '../../../../lib/core.js';

function adminOrRedirect(request) {
  const token = request.cookies.get('session_token')?.value;
  const db = getDb();
  const user = token ? getSessionUser(db, token) : null;
  if (!user || user.role !== 'admin') return { db, user: null, response: NextResponse.redirect(new URL('/admin?error=Admin+login+required', request.url)) };
  return { db, user };
}

function buildPreview(db, drawNumbers, mode) {
  const activeUsers = db.users.filter((u) => u.role === 'user' && u.subscriptionStatus === 'active');
  const projected = [];
  for (const user of activeUsers) {
    const scores = latestScoresForUser(db.scores, user.id, 5);
    if (!scores.length) continue;
    const matches = countMatches(scores, drawNumbers);
    if (matches >= 3) {
      projected.push({
        userId: user.id,
        userName: user.name,
        matchedCount: matches,
      });
    }
  }
  const prizePoolBalance = db.settings.prizePoolBalance + db.settings.jackpotCarry;
  const tierPools = buildTierPools(prizePoolBalance);
  const tier5 = projected.filter((p) => p.matchedCount === 5);
  const tier4 = projected.filter((p) => p.matchedCount === 4);
  const tier3 = projected.filter((p) => p.matchedCount === 3);
  return { projected, tier5, tier4, tier3, tierPools, mode };
}

export async function POST(request) {
  const auth = adminOrRedirect(request);
  if (auth.response) return auth.response;
  const { db } = auth;
  const form = await request.formData();
  const action = String(form.get('action') || 'simulate');
  const mode = String(form.get('mode') || db.settings.drawMode || 'random');
  db.settings.drawMode = mode;

  if (action === 'simulate') {
    const sourceScores = mode === 'algorithmic' ? db.scores : [];
    const drawNumbers = mode === 'algorithmic' ? weightedDrawNumbers(sourceScores) : randomUniqueNumbers(5);
    const preview = buildPreview(db, drawNumbers, mode);
    db.draws.push({
      id: makeId('draw'),
      month: monthKey(),
      mode,
      numbers: drawNumbers,
      status: 'draft',
      preview,
      prizePoolBalance: db.settings.prizePoolBalance + db.settings.jackpotCarry,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    return NextResponse.redirect(new URL('/admin?message=Draw+simulated', request.url));
  }

  if (action === 'publish') {
    const draft = [...db.draws].reverse().find((d) => d.status === 'draft');
    if (!draft) {
      return NextResponse.redirect(new URL('/admin?error=No+draft+draw+to+publish', request.url));
    }

    const prizePoolBalance = db.settings.prizePoolBalance + db.settings.jackpotCarry;
    const tierPools = buildTierPools(prizePoolBalance);
    const activeUsers = db.users.filter((u) => u.role === 'user' && u.subscriptionStatus === 'active');
    const resultRows = [];

    for (const user of activeUsers) {
      const scores = latestScoresForUser(db.scores, user.id, 5);
      const matchedCount = countMatches(scores, draft.numbers);
      if (matchedCount >= 3) {
        resultRows.push({
          id: makeId('winner'),
          drawId: draft.id,
          userId: user.id,
          userName: user.name,
          matchedCount,
          amount: 0,
          payoutStatus: 'pending',
          proofStatus: 'pending',
          proofPath: '',
          proofNote: '',
          createdAt: new Date().toISOString(),
        });
      }
    }

    const tier5 = resultRows.filter((w) => w.matchedCount === 5);
    const tier4 = resultRows.filter((w) => w.matchedCount === 4);
    const tier3 = resultRows.filter((w) => w.matchedCount === 3);

    const assign = (tier, pool) => {
      if (!tier.length) return 0;
      const amount = Math.floor(pool / tier.length);
      tier.forEach((w) => { w.amount = amount; });
      return amount * tier.length;
    };

    const paid5 = assign(tier5, tierPools.tier5);
    const paid4 = assign(tier4, tierPools.tier4);
    const paid3 = assign(tier3, tierPools.tier3);

    const unclaimedJackpot = tier5.length ? 0 : tierPools.tier5;
    db.settings.jackpotCarry = unclaimedJackpot;
    db.settings.prizePoolBalance = Math.max(0, db.settings.prizePoolBalance - (paid5 + paid4 + paid3));
    draft.status = 'published';
    draft.publishedAt = new Date().toISOString();
    draft.tierPools = tierPools;
    draft.winners = resultRows.length;

    db.winners.push(...resultRows);

    for (const w of resultRows) {
      db.notifications.push({
        id: makeId('note'),
        userId: w.userId,
        type: 'draw',
        message: `A draw result is available. Match count: ${w.matchedCount}.`,
        createdAt: new Date().toISOString(),
      });
    }

    saveDb(db);
    return NextResponse.redirect(new URL('/admin?message=Draw+published', request.url));
  }

  return NextResponse.redirect(new URL('/admin', request.url));
}
