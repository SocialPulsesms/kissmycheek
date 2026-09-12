/** Shared room-id helper safe to import from client and server. */

export function getCanonicalRoomId(userA: string, userB: string): string {
  const cleanA = String(userA || '').trim();
  const cleanB = String(userB || '').trim();
  if (!cleanA && !cleanB) return `call_room_${Date.now()}`;
  if (!cleanA) return `call_${cleanB}`;
  if (!cleanB) return `call_${cleanA}`;
  const sorted = [cleanA, cleanB].sort();
  return `call_${sorted[0]}__${sorted[1]}`;
}
