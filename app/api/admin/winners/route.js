import { NextResponse } from 'next/server';
import { getDb, getSessionUser, saveDb } from '../../../../lib/db.js';

function adminOrRedirect(request) {
  const token = request.cookies.get('session_token')?.value;
  const db = getDb();
  const user = token ? getSessionUser(db, token) : null;
  if (!user || user.role !== 'admin') return { db, user: null, response: NextResponse.redirect(new URL('/admin?error=Admin+login+required', request.url)) };
  return { db, user };
}

export async function POST(request) {
  const auth = adminOrRedirect(request);
  if (auth.response) return auth.response;
  const { db } = auth;
  const form = await request.formData();
  const action = String(form.get('action') || '');
  const id = String(form.get('winnerId') || '');
  const winner = db.winners.find((w) => w.id === id);

  if (winner && action === 'approve') {
    winner.proofStatus = 'approved';
    winner.verifiedAt = new Date().toISOString();
    winner.paymentStatus = winner.paymentStatus || 'pending';
  }

  if (winner && action === 'reject') {
    winner.proofStatus = 'rejected';
    winner.verifiedAt = new Date().toISOString();
  }

  if (winner && action === 'paid') {
    winner.paymentStatus = 'paid';
    winner.paidAt = new Date().toISOString();
  }

  saveDb(db);
  return NextResponse.redirect(new URL('/admin?message=Winner+updated', request.url));
}
