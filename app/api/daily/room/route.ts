import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { roomId } = body;

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: 'DAILY_API_KEY is not set in environment variables.'
      }, { status: 200 });
    }

    const sanitizedRoomName = `kmc-${(roomId || 'exclusive-date').toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`.slice(0, 60);

    // Attempt to create room on Daily.co
    const createRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: sanitizedRoomName,
        privacy: 'public',
        properties: {
          exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
          enable_screenshare: false,
          enable_chat: false,
          start_video_off: false,
          start_audio_off: false
        }
      })
    });

    const createData = await createRes.json();

    if (createRes.ok && createData?.url) {
      return NextResponse.json({
        success: true,
        configured: true,
        url: createData.url,
        roomName: createData.name
      });
    }

    // If room already exists, fetch it
    if (createData?.error === 'invalid-request-error' || createRes.status === 400) {
      const getRes = await fetch(`https://api.daily.co/v1/rooms/${sanitizedRoomName}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        return NextResponse.json({
          success: true,
          configured: true,
          url: getData.url,
          roomName: getData.name
        });
      }
    }

    return NextResponse.json({
      success: false,
      configured: true,
      error: createData?.info || createData?.error || 'Failed to provision Daily room'
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Server error provisioning Daily room'
    }, { status: 500 });
  }
}
