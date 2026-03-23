import { NextResponse } from 'next/server';
import { enforceRollingFive, getDb, getSessionUser, saveDb } from '../../../lib/db.js';
import { clamp, makeId, safeInt } from '../../../lib/core.js';

export async function POST(request) {
  const token = request.cookies.get('session_token')?.value;
  const db = getDb();
  const user = token ? getSessionUser(db, token) : null;
  if (!user || user.role !== 'user') {
    return NextResponse.redirect(new URL('/login?error=Please+sign+in', request.url));
  }

  const form = await request.formData();
  const action = String(form.get('action') || 'add');

  if (action === 'add') {
    const value = clamp(safeInt(form.get('value'), 0), 1, 45);
    const scoreDate = String(form.get('scoreDate') || new Date().toISOString().slice(0, 10));
    db.scores.push({
      id: makeId('score'),
      userId: user.id,
      value,
      scoreDate,
      createdAt: new Date().toISOString(),
    });
    const rolling = enforceRollingFive(db.scores, user.id);
    db.scores = db.scores.filter((s) => s.userId !== user.id).concat(rolling);
    saveDb(db);
    return NextResponse.redirect(new URL('/dashboard?message=Score+saved', request.url));
  }

  if (action === 'update') {
    const id = String(form.get('id') || '');
    const score = db.scores.find((s) => s.id === id && s.userId === user.id);
    if (score) {
      score.value = clamp(safeInt(form.get('value'), score.value), 1, 45);
      score.scoreDate = String(form.get('scoreDate') || score.scoreDate);
      score.updatedAt = new Date().toISOString();
      const rolling = enforceRollingFive(db.scores, user.id);
      db.scores = db.scores.filter((s) => s.userId !== user.id).concat(rolling);
      saveDb(db);
    }
    return NextResponse.redirect(new URL('/dashboard?message=Score+updated', request.url));
  }

  if (action === 'delete') {
    const id = String(form.get('id') || '');
    db.scores = db.scores.filter((s) => !(s.id === id && s.userId === user.id));
    saveDb(db);
    return NextResponse.redirect(new URL('/dashboard?message=Score+deleted', request.url));
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
