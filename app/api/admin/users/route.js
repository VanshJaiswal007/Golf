export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getDb, getSessionUser, saveDb } from '../../../../lib/db.js';
import { clamp, safeInt } from '../../../../lib/core.js';

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
  const userId = String(form.get('userId') || '');
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    user.name = String(form.get('name') || user.name).trim();
    user.subscriptionStatus = String(form.get('subscriptionStatus') || user.subscriptionStatus);
    user.subscriptionPlan = String(form.get('subscriptionPlan') || user.subscriptionPlan || 'monthly');
    const contribution = clamp(safeInt(form.get('charityContribution'), user.charityContribution || 10), 10, 100);
    user.charityContribution = contribution;
    user.updatedAt = new Date().toISOString();
  }
  saveDb(db);
  return NextResponse.redirect(new URL('/admin?message=User+updated', request.url));
}
