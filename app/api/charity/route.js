export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getDb, getSessionUser, saveDb } from '../../../lib/db.js';

export async function POST(request) {
  const token = request.cookies.get('session_token')?.value;
  const db = getDb();
  const user = token ? getSessionUser(db, token) : null;
  if (!user || user.role !== 'user') {
    return NextResponse.redirect(new URL('/login?error=Please+sign+in', request.url));
  }

  const form = await request.formData();
  const charityId = String(form.get('charityId') || '');
  const contribution = Math.max(10, Math.min(100, Number(form.get('charityContribution') || 10)));

  user.charityId = charityId || null;
  user.charityContribution = contribution;
  user.updatedAt = new Date().toISOString();
  saveDb(db);
  return NextResponse.redirect(new URL('/dashboard?message=Charity+updated', request.url));
}
