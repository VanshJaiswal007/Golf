import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentUserFromCookieStore } from '../lib/auth.js';

export default async function HomePage() {
  const cookieStore = await cookies();
  const user = currentUserFromCookieStore(cookieStore);
  redirect(user ? '/dashboard' : '/login');
}
