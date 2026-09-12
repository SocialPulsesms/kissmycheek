import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { roomId } = body;

    const domain = process.env.METERED_DOMAIN || 'kissmycheek';
    const apiKey = process.env.METERED_API_KEY || '7686e04f95b4a914e9328ed1342d10e2e005';
    const secretKey = process.env.METERED_SECRET_KEY || 'nKQKwU23a4yvWMCu6l5p-Las5MvTUlqNCxqTAs3lIUNnohVH';

    const sanitizedRoomName = (roomId || 'exclusive-date')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 50);

    const roomUrl = `https://${domain}.metered.live/${sanitizedRoomName}`;

    // Provision or verify the room on metered.ca / metered.live
    const createRes = await fetch(`https://${domain}.metered.live/api/v1/room?apiKey=${apiKey}&secretKey=${secretKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: sanitizedRoomName,
        privacy: 'public',
        autoJoin: true,
        showInviteBox: false,
        joinVideoOn: true,
        joinAudioOn: true,
        enableCamera: true,
        enableMicrophone: true,
        enableChat: true,
        enableScreenSharing: false
      })
    });

    const createData = await createRes.json().catch(() => ({}));

    // If successfully created OR already exists, return the Metered room details
    if (createRes.ok || (createData?.message && createData.message.includes('already exist'))) {
      return NextResponse.json({
        success: true,
        provider: 'metered.ca',
        domain: `${domain}.metered.live`,
        roomName: sanitizedRoomName,
        url: roomUrl,
        room: createData
      });
    }

    // Fallback: fetch existing room info
    const getRes = await fetch(`https://${domain}.metered.live/api/v1/room/${sanitizedRoomName}?apiKey=${apiKey}&secretKey=${secretKey}`);
    if (getRes.ok) {
      const getData = await getRes.json();
      return NextResponse.json({
        success: true,
        provider: 'metered.ca',
        domain: `${domain}.metered.live`,
        roomName: sanitizedRoomName,
        url: roomUrl,
        room: getData
      });
    }

    return NextResponse.json({
      success: false,
      provider: 'metered.ca',
      error: createData?.message || 'Failed to create Metered room'
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      provider: 'metered.ca',
      error: error?.message || 'Internal server error provisioning Metered room'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const domain = process.env.METERED_DOMAIN || 'kissmycheek';
  const apiKey = process.env.METERED_API_KEY || '7686e04f95b4a914e9328ed1342d10e2e005';
  const secretKey = process.env.METERED_SECRET_KEY || 'nKQKwU23a4yvWMCu6l5p-Las5MvTUlqNCxqTAs3lIUNnohVH';

  try {
    const res = await fetch(`https://${domain}.metered.live/api/v1/rooms?apiKey=${apiKey}&secretKey=${secretKey}`);
    const data = await res.json();
    return NextResponse.json({
      success: true,
      provider: 'metered.ca',
      rooms: data
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
