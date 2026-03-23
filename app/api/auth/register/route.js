export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { createSession, getDb, getUserByEmail, hashPassword, saveDb } from '../../../../lib/db.js';
import { normalizeEmail } from '../../../../lib/core.js';

export async function POST(request) {
  const form = await request.formData();
  const name = String(form.get('name') || '').trim();
  const email = normalizeEmail(form.get('email'));
  const password = String(form.get('password') || '');

  if (!name || !email || !password) {
    return NextResponse.redirect(new URL('/register?error=Missing+fields', request.url));
  }

  const db = getDb();
  if (getUserByEmail(db, email)) {
    return NextResponse.redirect(new URL('/register?error=Email+already+registered', request.url));
  }

  const user = {
    id: `user_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
    name,
    email,
    passwordHash: hashPassword(password),
    role: 'user',
    subscriptionStatus: 'inactive',
    subscriptionPlan: null,
    renewalDate: null,
    charityId: null,
    charityContribution: 10,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  const token = createSession(db, user.id);
  saveDb(db);

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set('session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
