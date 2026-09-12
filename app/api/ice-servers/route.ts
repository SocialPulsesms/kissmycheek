import { NextResponse } from 'next/server';
import { DEFAULT_ICE_SERVERS } from '@/lib/webrtcIceConfig';

export async function GET() {
  try {
    // If custom Metered API key or Xirsys is configured in environment, fetch dynamic ephemeral TURN credentials
    const meteredApiKey = process.env.METERED_API_KEY;
    const meteredDomain = process.env.METERED_DOMAIN;

    if (meteredApiKey && meteredDomain) {
      try {
        const res = await fetch(`https://${meteredDomain}.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`, {
          next: { revalidate: 3600 }
        });
        if (res.ok) {
          const dynamicIceServers = await res.json();
          if (Array.isArray(dynamicIceServers) && dynamicIceServers.length > 0) {
            return NextResponse.json({
              success: true,
              iceServers: [...dynamicIceServers, ...DEFAULT_ICE_SERVERS]
            });
          }
        }
      } catch (err) {
        console.warn('Metered dynamic ICE fetch fallback:', err);
      }
    }

    return NextResponse.json({
      success: true,
      iceServers: DEFAULT_ICE_SERVERS
    });
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      iceServers: DEFAULT_ICE_SERVERS
    });
  }
}
