import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb, getSessionUser, saveDb } from '../../../lib/db.js';
import { makeId } from '../../../lib/core.js';

export async function POST(request) {
  const token = request.cookies.get('session_token')?.value;
  const db = getDb();
  const user = token ? getSessionUser(db, token) : null;
  if (!user || user.role !== 'user') {
    return NextResponse.redirect(new URL('/login?error=Please+sign+in', request.url));
  }

  const form = await request.formData();
  const winnerId = String(form.get('winnerId') || '');
  const file = form.get('proofFile');
  const note = String(form.get('note') || '');

  const winner = db.winners.find((w) => w.id === winnerId && w.userId === user.id);
  if (!winner) {
    return NextResponse.redirect(new URL('/dashboard?error=Winner+record+not+found', request.url));
  }

  let savedPath = '';
  if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const ext = (file.name || 'proof.png').split('.').pop() || 'png';
    const filename = `${makeId('proof')}.${ext}`;
    const fullPath = path.join(uploadsDir, filename);
    fs.writeFileSync(fullPath, bytes);
    savedPath = `/uploads/${filename}`;
  }

  winner.proofPath = savedPath;
  winner.proofNote = note;
  winner.proofStatus = 'pending';
  winner.updatedAt = new Date().toISOString();

  db.notifications.push({
    id: makeId('note'),
    userId: user.id,
    type: 'proof',
    message: 'Winner proof submitted.',
    createdAt: new Date().toISOString(),
  });

  saveDb(db);
  return NextResponse.redirect(new URL('/dashboard?message=Proof+submitted', request.url));
}
