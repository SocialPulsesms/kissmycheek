export type CallInviteStatus = 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'ended';

export interface CallInvite {
  roomName: string;
  callerId: string;
  calleeId: string;
  callerName?: string;
  callerPhoto?: string;
  calleeName?: string;
  calleePhoto?: string;
  mode: 'video' | 'voice';
  status: CallInviteStatus;
  createdAt: number;
  updatedAt: number;
}

const RING_TIMEOUT_MS = 45_000;

type InviteGlobal = typeof globalThis & {
  kmcCallInvites?: Map<string, CallInvite>;
};

function inviteMap(): Map<string, CallInvite> {
  const g = globalThis as InviteGlobal;
  if (!g.kmcCallInvites) g.kmcCallInvites = new Map();
  return g.kmcCallInvites;
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
}

export function createCallInvite(data: Omit<CallInvite, 'status' | 'createdAt' | 'updatedAt'>): CallInvite {
  const existing = inviteMap().get(data.roomName);
  if (existing) {
    expireStale(existing);
    if (existing.status === 'ringing' || existing.status === 'accepted') {
      return existing;
    }
  }

  const invite: CallInvite = {
    ...data,
    status: 'ringing',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  inviteMap().set(invite.roomName, invite);
  return invite;
}

export function getCallInvite(roomName: string): CallInvite | null {
  const invite = inviteMap().get(roomName);
  if (!invite) return null;
  return expireStale(invite);
}

export function getIncomingCallForUser(userId: string | undefined): CallInvite | null {
  if (!userId) return null;
  for (const invite of inviteMap().values()) {
    expireStale(invite);
    if (invite.status === 'ringing' && invite.calleeId === userId) {
      return invite;
    }
  }
  return null;
}

export function updateCallInvite(
  roomName: string,
  status: CallInviteStatus,
  actorId?: string
): CallInvite | null {
  const invite = getCallInvite(roomName);
  if (!invite) return null;
  if (actorId && actorId !== invite.callerId && actorId !== invite.calleeId) {
    return null;
  }
  invite.status = status;
  invite.updatedAt = Date.now();
  return invite;
}

export function isCallParticipant(invite: CallInvite, userId: string): boolean {
  return invite.callerId === userId || invite.calleeId === userId;
}
