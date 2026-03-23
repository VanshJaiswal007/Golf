export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getDb, getSessionUser, saveDb } from '../../../../lib/db.js';
import { makeId } from '../../../../lib/core.js';

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
  const action = String(form.get('action') || 'add');

  if (action === 'add') {
    const name = String(form.get('name') || '').trim();
    const description = String(form.get('description') || '').trim();
    if (name && description) {
      db.charities.push({
        id: makeId('charity'),
        name,
        description,
        imageUrl: String(form.get('imageUrl') || '').trim(),
        spotlight: String(form.get('spotlight') || '') === 'on',
        events: String(form.get('events') || '').trim(),
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (action === 'update') {
    const id = String(form.get('id') || '');
    const charity = db.charities.find((c) => c.id === id);
    if (charity) {
      charity.name = String(form.get('name') || charity.name).trim();
      charity.description = String(form.get('description') || charity.description).trim();
      charity.imageUrl = String(form.get('imageUrl') || charity.imageUrl).trim();
      charity.spotlight = String(form.get('spotlight') || '') === 'on';
      charity.events = String(form.get('events') || charity.events).trim();
      charity.updatedAt = new Date().toISOString();
    }
  }

  if (action === 'delete') {
    const id = String(form.get('id') || '');
    db.charities = db.charities.filter((c) => c.id !== id);
    db.users.forEach((u) => {
      if (u.charityId === id) u.charityId = null;
    });
  }

  saveDb(db);
  return NextResponse.redirect(new URL('/admin?message=Charity+updated', request.url));
}
