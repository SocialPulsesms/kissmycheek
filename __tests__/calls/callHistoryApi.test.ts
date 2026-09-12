jest.mock('@/lib/prisma', () => ({
  prisma: {
    callHistory: {
      create: jest.fn().mockResolvedValue({ id: 'db-1' })
    }
  }
}));

import { GET, POST } from '@/app/api/call-history/route';
import { signJWT } from '@/lib/auth';
import { addCallRecord } from '@/lib/callHistoryStore';
import { prisma } from '@/lib/prisma';

function cookie() {
  return `session-token=${encodeURIComponent(
    signJWT({ userId: 'user-alice', email: 'alice@kissmycheek.org', role: 'MEMBER' })
  )}`;
}

describe('POST /api/call-history', () => {
  it('stores a hangup record and mirrors it to Prisma', async () => {
    const res = await POST(
      new Request('http://localhost/api/call-history', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: cookie() },
        body: JSON.stringify({
          partnerId: 'user-bob',
          partnerName: 'Bob',
          callType: 'voice',
          durationSeconds: 15,
          durationFormatted: '00:15',
          status: 'completed'
        })
      })
    );

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.record.callerId).toBe('user-alice');
    expect(body.record.partnerId).toBe('user-bob');
    expect(body.record.callType).toBe('voice');
    expect(body.record.durationSeconds).toBe(15);
    expect(prisma.callHistory.create).toHaveBeenCalledWith({
      data: {
        callerId: 'user-alice',
        receiverId: 'user-bob',
        duration: 15,
        outcome: 'COMPLETED'
      }
    });
  });

  it('defaults missing fields so a missed ring still logs', async () => {
    const res = await POST(
      new Request('http://localhost/api/call-history', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: cookie() },
        body: JSON.stringify({ status: 'missed' })
      })
    );

    const body = await res.json();
    expect(body.record.status).toBe('missed');
    expect(body.record.partnerName).toBe('Private Encounter');
    expect(body.record.callType).toBe('video');
  });
});

describe('GET /api/call-history', () => {
  it('returns calls with a specific partner', async () => {
    addCallRecord({
      callerId: 'user-alice',
      receiverId: 'user-bob',
      partnerId: 'user-bob',
      partnerName: 'Bob',
      partnerPhoto: '',
      partnerOccupation: 'Member',
      callType: 'video',
      durationSeconds: 9,
      durationFormatted: '00:09',
      timestamp: 'Just now',
      status: 'completed',
      qualityPreset: '1080p'
    });

    const res = await GET(
      new Request('http://localhost/api/call-history?withUser=user-bob', {
        headers: { cookie: cookie() }
      })
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totalCalls).toBe(1);
    expect(body.callHistory[0].partnerId).toBe('user-bob');
  });

  it('returns the session user\'s full history', async () => {
    addCallRecord({
      callerId: 'user-alice',
      receiverId: 'user-cara',
      partnerId: 'user-cara',
      partnerName: 'Cara',
      partnerPhoto: '',
      partnerOccupation: 'Member',
      callType: 'video',
      durationSeconds: 3,
      durationFormatted: '00:03',
      timestamp: 'Just now',
      status: 'declined',
      qualityPreset: 'standard'
    });

    const res = await GET(
      new Request('http://localhost/api/call-history', {
        headers: { cookie: cookie() }
      })
    );
    const body = await res.json();
    expect(body.totalCalls).toBeGreaterThanOrEqual(1);
    expect(body.callHistory.some((row: { partnerId: string }) => row.partnerId === 'user-cara')).toBe(true);
  });
});
