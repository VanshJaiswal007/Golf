export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getDb, getSessionUser, saveDb } from '../../../lib/db.js';
import { CHARITY_MIN_RATE, computeCharityContribution, computePrizeContribution, renewalDateFor } from '../../../lib/core.js';

export async function POST(request) {
  const token = request.cookies.get('session_token')?.value;
  const db = getDb();
  const user = token ? getSessionUser(db, token) : null;
  if (!user || user.role !== 'user') {
    return NextResponse.redirect(new URL('/login?error=Please+sign+in', request.url));
  }

  const form = await request.formData();
  const plan = String(form.get('plan') || 'monthly');
  const charityId = String(form.get('charityId') || '');
  const charityContribution = Math.max(CHARITY_MIN_RATE * 100, Math.min(100, Number(form.get('charityContribution') || 10)));

  const planPrice = plan === 'yearly' ? db.settings.yearlyPrice : db.settings.monthlyPrice;
  db.settings.prizePoolBalance += computePrizeContribution(plan);
  db.settings.charityFundTotal += computeCharityContribution(plan, charityContribution);
  db.settings.platformRevenue += Math.max(0, planPrice - computePrizeContribution(plan) - computeCharityContribution(plan, charityContribution));

  user.subscriptionStatus = 'active';
  user.subscriptionPlan = plan;
  user.renewalDate = renewalDateFor(plan);
  user.charityId = charityId || user.charityId;
  user.charityContribution = charityContribution;
  user.updatedAt = new Date().toISOString();

  db.notifications.push({
    id: `note_${Date.now()}`,
    userId: user.id,
    type: 'subscription',
    message: `Subscription activated for ${plan} plan.`,
    createdAt: new Date().toISOString(),
  });

  saveDb(db);
  return NextResponse.redirect(new URL('/dashboard?message=Subscription+updated', request.url));
}
