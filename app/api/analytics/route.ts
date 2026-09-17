import { NextResponse } from 'next/server';
import { getPersistentAnalytics, logActivityHistoryRecord, savePersistentAnalytics } from '@/lib/analyticsStore';

export async function GET(req: Request) {
  try {
    const data = getPersistentAnalytics();
    return NextResponse.json({
      success: true,
      analytics: data
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to query analytics' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, logRecord, updateData } = body;

    if (action === 'log_activity' && logRecord) {
      if (logRecord.category === 'CALL') {
        return NextResponse.json({ success: true, ignored: true });
      }
      const createdLog = logActivityHistoryRecord(logRecord);
      return NextResponse.json({
        success: true,
        log: createdLog
      });
    }

    if (action === 'update_analytics' && updateData) {
      savePersistentAnalytics(updateData);
      return NextResponse.json({
        success: true,
        message: 'Analytics updated successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update analytics' }, { status: 500 });
  }
}
