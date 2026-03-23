import { cookies } from 'next/headers';
import { getDb, getSessionUser } from './db.js';

export function readSessionTokenFromCookieStore(cookieStore) {
  return cookieStore?.get('session_token')?.value || '';
}

export function currentUserFromCookieStore(cookieStore) {
  const db = getDb();
  const token = readSessionTokenFromCookieStore(cookieStore);
  return getSessionUser(db, token);
}

export async function requireUser() {
  const cookieStore = await cookies();
  return currentUserFromCookieStore(cookieStore);
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  const user = currentUserFromCookieStore(cookieStore);
  return user && user.role === 'admin' ? user : null;
}
