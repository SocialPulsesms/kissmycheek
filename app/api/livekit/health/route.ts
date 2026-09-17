export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import net from 'net';
import { getLiveKitConfig } from '@/lib/livekitConfig';

function canConnect(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

export async function GET() {
  const config = getLiveKitConfig();
  const listening = await canConnect('127.0.0.1', 7880);
  return NextResponse.json({
    ok: listening && Boolean(config?.url),
    livekitProcessListening: listening,
    publicUrlConfigured: Boolean(config?.url),
    publicUrl: config?.url || null
  });
}
