import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  makeId,
  monthKey,
  normalizeEmail,
  nowISO,
} from './core.js';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'db.json');

function ensureDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function initialDb() {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(DEFAULT_ADMIN_PASSWORD, salt, 120000, 32, 'sha256').toString('hex');
  return {
    users: [
      {
        id: makeId('user'),
        name: 'Admin',
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash: `${salt}:${hash}`,
        role: 'admin',
        subscriptionStatus: 'active',
        subscriptionPlan: 'yearly',
        renewalDate: null,
        charityId: null,
        charityContribution: 10,
        createdAt: nowISO(),
      },
    ],
    charities: [
      {
        id: makeId('charity'),
        name: 'Fairway Futures',
        description: 'A charity focused on youth access, coaching, and community support.',
        imageUrl: '',
        spotlight: true,
        events: 'Junior sports day and coaching camps',
        createdAt: nowISO(),
      },
      {
        id: makeId('charity'),
        name: 'Bright Greens Aid',
        description: 'Supports local relief, education, and family assistance programs.',
        imageUrl: '',
        spotlight: false,
        events: 'Monthly volunteer outreach',
        createdAt: nowISO(),
      },
      {
        id: makeId('charity'),
        name: 'Hope Match Fund',
        description: 'Funds emergency help and long-term community uplift initiatives.',
        imageUrl: '',
        spotlight: false,
        events: 'Community fundraising walk',
        createdAt: nowISO(),
      },
    ],
    scores: [],
    draws: [],
    winners: [],
    sessions: [],
    notifications: [],
    settings: {
      monthlyPrice: 499,
      yearlyPrice: 4999,
      prizePoolBalance: 0,
      charityFundTotal: 0,
      platformRevenue: 0,
      jackpotCarry: 0,
      drawMode: 'random',
      month: monthKey(),
    },
  };
}

function loadDb() {
  ensureDir();
  if (!fs.existsSync(dbPath)) {
    const db = initialDb();
    saveDb(db);
    return db;
  }
  const raw = fs.readFileSync(dbPath, 'utf-8');
  return raw ? JSON.parse(raw) : initialDb();
}

function saveDb(db) {
  ensureDir();
  const temp = `${dbPath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(temp, dbPath);
}

export { saveDb };

export function getDb() {
  return loadDb();
}

export function setDb(db) {
  saveDb(db);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

export function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());
  db.sessions.push({ token, userId, expiresAt: expiresAt.toISOString(), createdAt: nowISO() });
  return token;
}

export function destroySession(db, token) {
  db.sessions = db.sessions.filter((s) => s.token !== token);
}

export function getUserByEmail(db, email) {
  return db.users.find((u) => normalizeEmail(u.email) === normalizeEmail(email)) || null;
}

export function getUserById(db, id) {
  return db.users.find((u) => u.id === id) || null;
}

export function getSessionUser(db, token) {
  const session = db.sessions.find((s) => s.token === token && new Date(s.expiresAt).getTime() > Date.now());
  if (!session) return null;
  return getUserById(db, session.userId);
}

export function saveDbAndReturn(db, value) {
  saveDb(db);
  return value;
}

export function enforceRollingFive(scores, userId) {
  // get only this user's scores
  const userScores = scores
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.scoreDate) - new Date(a.scoreDate));

  // keep only latest 5
  return userScores.slice(0, 5);
}