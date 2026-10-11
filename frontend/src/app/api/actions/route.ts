import { NextResponse } from 'next/server';
import { actionsFixture } from '@/lib/actionsFixture';

/**
 * GET /api/actions
 * Next.js API Route Handler providing operational actions from actions.csv.
 */
export async function GET() {
  return NextResponse.json(
    { actions: actionsFixture },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
