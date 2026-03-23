import { NextResponse } from 'next/server';
import { createSession, getDb, getUserByEmail, saveDb, verifyPassword } from '../../../../lib/db.js';
import { normalizeEmail } from '../../../../lib/core.js';

export async function POST(request) {
  const form = await request.formData();
  const email = normalizeEmail(form.get('email'));
  const password = String(form.get('password') || '');
  const nextUrl = new URL(request.url).searchParams.get('next') || '/dashboard';

  const db = getDb();
  const user = getUserByEmail(db, email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    const base = user && user.role === 'admin' ? '/admin' : '/login';
    return NextResponse.redirect(new URL(`${base}?error=Invalid+credentials`, request.url));
  }

  const token = createSession(db, user.id);
  saveDb(db);

  const response = NextResponse.redirect(new URL(user.role === 'admin' ? '/admin' : nextUrl, request.url));
  response.cookies.set('session_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
