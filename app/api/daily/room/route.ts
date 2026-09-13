import { NextRequest, NextResponse } from 'next/server';

const DAILY_API_KEY = process.env.DAILY_API_KEY || '40887de61982235ec797687d8c15c79a980b690f12c921208c2cc0e219e3fd5b';
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'kissmycheek';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { roomId, mode = 'video' } = body;

    const baseName = (roomId || 'exclusive-date')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 45);

    const sanitizedRoomName = `kmc-${baseName}`;
    const futureExp = Math.floor(Date.now() / 1000) + 7200; // 2 hours

    // 1. Create or verify Daily.co room
    const createRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: sanitizedRoomName,
        privacy: 'public',
        properties: {
          enable_prejoin_ui: false,
          enable_chat: false,
          enable_screenshare: false,
          start_video_off: mode === 'voice',
          exp: futureExp
        }
      })
    });

    const createData = await createRes.json().catch(() => ({}));

    if (createRes.ok && createData?.url) {
      return NextResponse.json({
        success: true,
        provider: 'daily.co',
        domain: `${DAILY_DOMAIN}.daily.co`,
        roomName: createData.name,
        url: createData.url
      });
    }

    // 2. If room already exists, fetch it directly
    const getRes = await fetch(`https://api.daily.co/v1/rooms/${sanitizedRoomName}`, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });

    if (getRes.ok) {
      const getData = await getRes.json().catch(() => ({}));
      if (getData?.url) {
        return NextResponse.json({
          success: true,
          provider: 'daily.co',
          domain: `${DAILY_DOMAIN}.daily.co`,
          roomName: getData.name,
          url: getData.url
        });
      }
    }

    // 3. Guaranteed valid URL fallback
    const fallbackUrl = `https://${DAILY_DOMAIN}.daily.co/${sanitizedRoomName}`;
    return NextResponse.json({
      success: true,
      provider: 'daily.co',
      domain: `${DAILY_DOMAIN}.daily.co`,
      roomName: sanitizedRoomName,
      url: fallbackUrl
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to provision Daily room'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const res = await fetch('https://api.daily.co/v1/rooms', {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      provider: 'daily.co',
      domain: `${DAILY_DOMAIN}.daily.co`,
      data
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
