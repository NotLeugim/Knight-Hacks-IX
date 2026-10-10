import { NextResponse } from 'next/server';
import { triageFixture } from '@/lib/triageFixture';

/**
 * GET /api/triage
 * Next.js API Route Handler providing the triage queue.
 * Returns risk-ranked anomalies for operator review.
 */
export async function GET() {
  return NextResponse.json(
    { queue: triageFixture },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
