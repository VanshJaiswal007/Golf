import { NextResponse } from 'next/server';
import { destroySession, getDb, saveDb } from '../../../../lib/db.js';

export async function POST(request) {
  const token = request.cookies.get('session_token')?.value;
  if (token) {
    const db = getDb();
    destroySession(db, token);
    saveDb(db);
  }
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set('session_token', '', { path: '/', maxAge: 0 });
  return response;
}
