const LIVEKIT_SAFE = /[^a-zA-Z0-9_-]/g;

export function getCanonicalRoomName(userAId: string, userBId: string): string {
  const a = String(userAId || '').trim().replace(LIVEKIT_SAFE, '').slice(0, 64);
  const b = String(userBId || '').trim().replace(LIVEKIT_SAFE, '').slice(0, 64);
  const sorted = [a, b].sort();
  return `kmc_${sorted[0]}_${sorted[1]}`.slice(0, 128);
}
