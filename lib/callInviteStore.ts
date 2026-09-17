export type CallInviteStatus = 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'ended';

export interface CallInvite {
  roomName: string;
  callerId: string;
  calleeId: string;
  callerIds: string[];
  calleeIds: string[];
  callerName?: string;
  callerPhoto?: string;
  calleeName?: string;
  calleePhoto?: string;
  mode: 'video' | 'voice';
  status: CallInviteStatus;
  createdAt: number;
  updatedAt: number;
}

const RING_TIMEOUT_MS = 90_000;

type InviteGlobal = typeof globalThis & {
  kmcCallInvites?: Map<string, CallInvite>;
};

function persistEnabled(): boolean {
  return process.env.NODE_ENV !== 'test' && typeof window === 'undefined';
}

function persistPath(): string | null {
  if (!persistEnabled()) return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    return path.join(dataDir, 'persistent_call_invites.json');
  } catch {
    return null;
  }
}

function inviteMap(): Map<string, CallInvite> {
  const g = globalThis as InviteGlobal;
  if (!g.kmcCallInvites) {
    g.kmcCallInvites = new Map();
    const filePath = persistPath();
    if (filePath) {
      try {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (Array.isArray(parsed)) {
            parsed.forEach((item: CallInvite) => g.kmcCallInvites!.set(item.roomName, item));
          }
        }
      } catch {}
    }
  }
  return g.kmcCallInvites;
}

function saveInvites() {
  const filePath = persistPath();
  if (!filePath) return;
  try {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(Array.from(inviteMap().values()), null, 2), 'utf-8');
  } catch {}
}

function norm(value: string | undefined | null): string {
  return String(value || '').trim().toLowerCase();
}

function uniqueIds(ids: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  ids.forEach((id) => {
    const raw = String(id || '').trim();
    if (!raw) return;
    const key = raw.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

function idsOverlap(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = new Set((a || []).map(norm).filter(Boolean));
  return (b || []).some((id) => left.has(norm(id)));
}

function expireStale(invite: CallInvite): CallInvite {
  if (invite.status === 'ringing' && Date.now() - invite.createdAt > RING_TIMEOUT_MS) {
    invite.status = 'cancelled';
    invite.updatedAt = Date.now();
  }
  return invite;
}

export function resetCallInviteStore() {
  inviteMap().clear();
  saveInvites();
}

export function createCallInvite(
  data: Omit<CallInvite, 'status' | 'createdAt' | 'updatedAt' | 'callerIds' | 'calleeIds'> & {
    callerIds?: string[];
    calleeIds?: string[];
  }
): CallInvite {
  const existing = inviteMap().get(data.roomName);
  if (existing) {
    expireStale(existing);
    if (existing.status === 'ringing' || existing.status === 'accepted') {
      return existing;
    }
  }

  const invite: CallInvite = {
    ...data,
    callerIds: uniqueIds([data.callerId, ...(data.callerIds || [])]),
    calleeIds: uniqueIds([data.calleeId, ...(data.calleeIds || [])]),
    status: 'ringing',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  inviteMap().set(invite.roomName, invite);
  saveInvites();
  return invite;
}

export function getCallInvite(roomName: string): CallInvite | null {
  const invite = inviteMap().get(roomName);
  if (!invite) return null;
  return expireStale(invite);
}

export function getIncomingCallForUser(
  userId: string | undefined,
  extraIds: string[] = []
): CallInvite | null {
  const needles = uniqueIds([userId, ...extraIds]);
  if (needles.length === 0) return null;
  for (const invite of inviteMap().values()) {
    expireStale(invite);
    if (invite.status !== 'ringing') continue;
    if (idsOverlap(invite.calleeIds || [invite.calleeId], needles)) {
      if (idsOverlap(invite.callerIds || [invite.callerId], needles)) continue;
      return invite;
    }
  }
  return null;
}

export function updateCallInvite(
  roomName: string,
  status: CallInviteStatus,
  actorId?: string,
  actorIds: string[] = []
): CallInvite | null {
  const invite = getCallInvite(roomName);
  if (!invite) return null;
  if (actorId && !isCallParticipant(invite, actorId, actorIds)) {
    return null;
  }
  invite.status = status;
  invite.updatedAt = Date.now();
  saveInvites();
  return invite;
}

export function isCallParticipant(
  invite: CallInvite,
  userId: string,
  extraIds: string[] = []
): boolean {
  const needles = uniqueIds([userId, ...extraIds]);
  return (
    idsOverlap(invite.callerIds || [invite.callerId], needles) ||
    idsOverlap(invite.calleeIds || [invite.calleeId], needles)
  );
}

export function isCallee(invite: CallInvite, userId: string, extraIds: string[] = []): boolean {
  return idsOverlap(invite.calleeIds || [invite.calleeId], uniqueIds([userId, ...extraIds]));
}
