import { NextResponse } from 'next/server';
import { grantBirthdayRewards } from '@/lib/loyalty';
import { guardMaintenance } from '@/lib/maintenance-auth';
import { errorResponse } from '@/lib/errors';

/** POST /api/v1/maintenance/rewards — پاداش تولد و سالگرد (cron روزانه). */
export async function POST(req: Request) {
  try {
    const denied = guardMaintenance(req);
    if (denied) return denied;
    const result = await grantBirthdayRewards();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) { return errorResponse(e); }
}
