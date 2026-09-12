import { NextResponse } from 'next/server';
import { DEFAULT_ICE_SERVERS, getStaticEnvTurnServers, WebRtcIceServer } from '@/lib/webrtcIceConfig';

async function fetchMeteredIce(): Promise<WebRtcIceServer[]> {
  const meteredApiKey = process.env.METERED_API_KEY;
  const meteredDomain = process.env.METERED_DOMAIN;
  if (!meteredApiKey || !meteredDomain) return [];

  try {
    const res = await fetch(
      `https://${meteredDomain}.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const dynamicIceServers = await res.json();
    return Array.isArray(dynamicIceServers) ? dynamicIceServers : [];
  } catch (err) {
    console.warn('Metered dynamic ICE fetch fallback:', err);
    return [];
  }
}

async function fetchTwilioIce(): Promise<WebRtcIceServer[]> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return [];

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Tokens.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.ice_servers) ? data.ice_servers : [];
  } catch (err) {
    console.warn('Twilio ICE fetch fallback:', err);
    return [];
  }
}

export async function GET() {
  try {
    const [metered, twilio] = await Promise.all([fetchMeteredIce(), fetchTwilioIce()]);
    const iceServers = [
      ...getStaticEnvTurnServers(),
      ...metered,
      ...twilio,
      ...DEFAULT_ICE_SERVERS
    ];

    return NextResponse.json({
      success: true,
      iceServers
    });
  } catch {
    return NextResponse.json({
      success: true,
      iceServers: [...getStaticEnvTurnServers(), ...DEFAULT_ICE_SERVERS]
    });
  }
}
