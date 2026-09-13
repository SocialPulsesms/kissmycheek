// WebRTC signaling store. Memory-first with a JSON file write-through so
// PM2 restarts and a second Node worker on the same VPS still see live rooms.

import { getCanonicalRoomId } from './callRoomId';

export { getCanonicalRoomId };

export interface CallPeer {
  id: string;
  role: 'caller' | 'callee';
  joinedAt: number;
  lastActive: number;
}

export interface CallRoomEvent {
  id: string;
  senderPeerId: string;
  type: 'reaction' | 'icebreaker' | 'media_state';
  data: any;
  timestamp: number;
}

export type CallRoomStatus = 'WAITING' | 'CONNECTING' | 'CONNECTED' | 'ENDED';
export type CallInviteStatus = 'RINGING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'ENDED';

export interface CallRoom {
  roomId: string;
  createdAt: number;
  callerId: string | null;
  callerName?: string | null;
  callerPhoto?: string | null;
  calleeId: string | null;
  calleeName?: string | null;
  calleePhoto?: string | null;
  offer: any | null;
  answer: any | null;
  callerCandidates: any[];
  calleeCandidates: any[];
  events: CallRoomEvent[];
  status: CallRoomStatus;
}

export interface ActiveCallInvite {
  callId: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  calleeId: string;
  calleeName?: string;
  calleeEmail?: string;
  callMode: 'voice' | 'video';
  status: CallInviteStatus;
  createdAt: number;
  updatedAt: number;
  roomUrl?: string;
}

const globalForCallSignaling = globalThis as unknown as {
  activeCallRooms?: Map<string, CallRoom>;
  activeCallInvites?: Map<string, ActiveCallInvite>;
  callSignalingHydrated?: boolean;
  callSignalingPersistTimer?: ReturnType<typeof setTimeout> | null;
};

if (!globalForCallSignaling.activeCallRooms) {
  globalForCallSignaling.activeCallRooms = new Map<string, CallRoom>();
}

if (!globalForCallSignaling.activeCallInvites) {
  globalForCallSignaling.activeCallInvites = new Map<string, ActiveCallInvite>();
}

export const activeCallRooms = globalForCallSignaling.activeCallRooms!;
export const activeCallInvites = globalForCallSignaling.activeCallInvites!;

function isTestEnv() {
  return Boolean(process.env.JEST_WORKER_ID) || process.env.NODE_ENV === 'test';
}

/** Clears live rooms/invites. Used by Jest so cases do not leak into each other. */
export function resetCallSignalingStore() {
  activeCallRooms.clear();
  activeCallInvites.clear();
  globalForCallSignaling.callSignalingHydrated = true;
  if (globalForCallSignaling.callSignalingPersistTimer) {
    clearTimeout(globalForCallSignaling.callSignalingPersistTimer);
    globalForCallSignaling.callSignalingPersistTimer = null;
  }
}

function getPersistencePath(): string | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'persistent_call_signaling.json');
  } catch {
    return null;
  }
}

function persistNow() {
  if (typeof window !== 'undefined' || isTestEnv()) return;
  const filePath = getPersistencePath();
  if (!filePath) return;
  try {
    const fs = require('fs') as typeof import('fs');
    const rooms: Record<string, CallRoom> = {};
    for (const [id, room] of activeCallRooms.entries()) {
      rooms[id] = room;
    }
    const invites: Record<string, ActiveCallInvite> = {};
    for (const invite of activeCallInvites.values()) {
      invites[invite.callId] = invite;
      invites[invite.roomId] = invite;
    }
    fs.writeFileSync(filePath, JSON.stringify({ rooms, invites, savedAt: Date.now() }), 'utf-8');
  } catch (err) {
    console.warn('Call signaling persist error:', err);
  }
}

function schedulePersist() {
  if (typeof window !== 'undefined' || isTestEnv()) return;
  if (globalForCallSignaling.callSignalingPersistTimer) {
    clearTimeout(globalForCallSignaling.callSignalingPersistTimer);
  }
  globalForCallSignaling.callSignalingPersistTimer = setTimeout(persistNow, 30);
}

function hydrateFromDisk() {
  if (typeof window !== 'undefined' || isTestEnv()) {
    globalForCallSignaling.callSignalingHydrated = true;
    return;
  }
  if (globalForCallSignaling.callSignalingHydrated) return;
  globalForCallSignaling.callSignalingHydrated = true;

  const filePath = getPersistencePath();
  if (!filePath) return;
  try {
    const fs = require('fs') as typeof import('fs');
    if (!fs.existsSync(filePath)) return;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (parsed?.rooms && typeof parsed.rooms === 'object') {
      for (const [id, room] of Object.entries(parsed.rooms as Record<string, CallRoom>)) {
        if (!activeCallRooms.has(id) && room && room.roomId) {
          if (!room.events) room.events = [];
          activeCallRooms.set(id, room);
        }
      }
    }
    if (parsed?.invites && typeof parsed.invites === 'object') {
      for (const [id, invite] of Object.entries(parsed.invites as Record<string, ActiveCallInvite>)) {
        if (!activeCallInvites.has(id) && invite && invite.callId) {
          activeCallInvites.set(id, invite);
          if (invite.roomId) activeCallInvites.set(invite.roomId, invite);
        }
      }
    }
  } catch (err) {
    console.warn('Call signaling hydrate error:', err);
  }
}

function ensureReady() {
  hydrateFromDisk();
}

function cleanStaleRooms() {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  let removed = false;
  for (const [id, room] of activeCallRooms.entries()) {
    if (room.createdAt < cutoff || (room.status === 'ENDED' && Date.now() - room.createdAt > 60_000)) {
      activeCallRooms.delete(id);
      removed = true;
    }
  }
  if (removed) schedulePersist();
}

export function cleanStaleInvites() {
  ensureReady();
  const now = Date.now();
  let removed = false;
  for (const [id, invite] of activeCallInvites.entries()) {
    if (invite.status === 'RINGING' && now - invite.createdAt > 45_000) {
      invite.status = 'ENDED';
      invite.updatedAt = now;
      const room = activeCallRooms.get(invite.roomId);
      if (room && room.status !== 'CONNECTED') room.status = 'ENDED';
      removed = true;
    } else if (
      (invite.status === 'DECLINED' || invite.status === 'CANCELLED' || invite.status === 'ENDED') &&
      now - invite.updatedAt > 45_000
    ) {
      activeCallInvites.delete(id);
      removed = true;
    } else if (invite.status === 'ACCEPTED' && now - invite.updatedAt > 120_000) {
      activeCallInvites.delete(id);
      removed = true;
    }
  }
  if (removed) schedulePersist();
}

export function getOrCreateRoom(roomId: string): CallRoom {
  ensureReady();
  cleanStaleRooms();
  let room = activeCallRooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      createdAt: Date.now(),
      callerId: null,
      callerName: null,
      callerPhoto: null,
      calleeId: null,
      calleeName: null,
      calleePhoto: null,
      offer: null,
      answer: null,
      callerCandidates: [],
      calleeCandidates: [],
      events: [],
      status: 'WAITING'
    };
    activeCallRooms.set(roomId, room);
    schedulePersist();
  } else if (!room.events) {
    room.events = [];
  }
  return room;
}

export function joinRoom(
  roomId: string,
  peerId: string,
  preferredRole?: 'caller' | 'callee',
  userName?: string,
  userPhoto?: string
): {
  role: 'caller' | 'callee';
  room: CallRoom;
  offer?: any;
  answer?: any;
  partnerName?: string;
  partnerPhoto?: string;
} {
  const room = getOrCreateRoom(roomId);

  let role: 'caller' | 'callee';

  if (room.callerId === peerId) {
    role = 'caller';
  } else if (room.calleeId === peerId) {
    role = 'callee';
  } else if (preferredRole === 'caller') {
    if (room.callerId !== peerId) {
      room.callerId = peerId;
      room.offer = null;
      room.answer = null;
      room.callerCandidates = [];
      room.calleeCandidates = [];
      room.events = [];
      if (room.status === 'ENDED') room.status = 'WAITING';
      else room.status = 'WAITING';
    }
    role = 'caller';
  } else if (preferredRole === 'callee') {
    if (room.calleeId !== peerId) {
      room.calleeId = peerId;
      room.answer = null;
      room.calleeCandidates = [];
      room.status = 'CONNECTING';
    }
    role = 'callee';
  } else if (!room.callerId) {
    room.callerId = peerId;
    room.status = 'WAITING';
    role = 'caller';
  } else if (!room.calleeId) {
    room.calleeId = peerId;
    room.status = 'CONNECTING';
    role = 'callee';
  } else {
    room.calleeId = peerId;
    room.status = 'CONNECTING';
    role = 'callee';
  }

  if (role === 'caller') {
    if (userName && userName !== 'Club Member' && userName !== 'Exclusive Member') {
      room.callerName = userName;
    }
    if (userPhoto) room.callerPhoto = userPhoto;
  } else {
    if (userName && userName !== 'Club Member' && userName !== 'Exclusive Member') {
      room.calleeName = userName;
    }
    if (userPhoto) room.calleePhoto = userPhoto;
  }

  const invite = activeCallInvites.get(roomId);
  if (invite) {
    if (!room.callerName && invite.callerName && invite.callerName !== 'Club Member') {
      room.callerName = invite.callerName;
    }
    if (!room.callerPhoto && invite.callerPhoto) {
      room.callerPhoto = invite.callerPhoto;
    }
    if (!room.calleeName && invite.calleeName && invite.calleeName !== 'Club Member') {
      room.calleeName = invite.calleeName;
    }
  }

  schedulePersist();

  const isCaller = role === 'caller';
  return {
    role,
    room,
    offer: !isCaller ? room.offer : undefined,
    answer: isCaller ? room.answer : undefined,
    partnerName: (isCaller ? room.calleeName : room.callerName) || undefined,
    partnerPhoto: (isCaller ? room.calleePhoto : room.callerPhoto) || undefined
  };
}

export function setRoomOffer(roomId: string, peerId: string, offer: any): boolean {
  const room = getOrCreateRoom(roomId);
  room.offer = offer;
  schedulePersist();
  return true;
}

export function setRoomAnswer(roomId: string, peerId: string, answer: any): boolean {
  const room = getOrCreateRoom(roomId);
  room.answer = answer;
  room.status = 'CONNECTED';
  const invite = activeCallInvites.get(roomId);
  if (invite && invite.status === 'RINGING') {
    invite.status = 'ACCEPTED';
    invite.updatedAt = Date.now();
  }
  schedulePersist();
  return true;
}

export function addIceCandidate(roomId: string, peerId: string, candidate: any, fallbackRole?: 'caller' | 'callee'): boolean {
  const room = getOrCreateRoom(roomId);
  if (!candidate) return false;

  if (peerId === room.callerId || (fallbackRole === 'caller' && peerId !== room.calleeId)) {
    room.callerCandidates.push(candidate);
    schedulePersist();
    return true;
  }
  if (peerId === room.calleeId || (fallbackRole === 'callee' && peerId !== room.callerId)) {
    room.calleeCandidates.push(candidate);
    schedulePersist();
    return true;
  }
  if (!room.callerId) {
    room.callerId = peerId;
    room.callerCandidates.push(candidate);
    schedulePersist();
    return true;
  }
  if (!room.calleeId && peerId !== room.callerId) {
    room.calleeId = peerId;
    room.calleeCandidates.push(candidate);
    schedulePersist();
    return true;
  }
  return false;
}

export function addIceCandidates(roomId: string, peerId: string, candidates: any[], fallbackRole?: 'caller' | 'callee'): boolean {
  const room = getOrCreateRoom(roomId);
  if (!Array.isArray(candidates) || candidates.length === 0) return false;

  if (peerId === room.callerId || (fallbackRole === 'caller' && peerId !== room.calleeId)) {
    room.callerCandidates.push(...candidates);
    schedulePersist();
    return true;
  }
  if (peerId === room.calleeId || (fallbackRole === 'callee' && peerId !== room.callerId)) {
    room.calleeCandidates.push(...candidates);
    schedulePersist();
    return true;
  }
  if (!room.callerId) {
    room.callerId = peerId;
    room.callerCandidates.push(...candidates);
    schedulePersist();
    return true;
  }
  if (!room.calleeId && peerId !== room.callerId) {
    room.calleeId = peerId;
    room.calleeCandidates.push(...candidates);
    schedulePersist();
    return true;
  }
  return false;
}

export function addRoomEvent(roomId: string, event: { senderPeerId: string; type: 'reaction' | 'icebreaker' | 'media_state'; data: any }): boolean {
  const room = getOrCreateRoom(roomId);
  if (!room.events) room.events = [];
  const fullEvent: CallRoomEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderPeerId: event.senderPeerId,
    type: event.type,
    data: event.data,
    timestamp: Date.now()
  };
  room.events.push(fullEvent);
  if (room.events.length > 50) {
    room.events = room.events.slice(-50);
  }
  schedulePersist();
  return true;
}

export function endCallSession(roomId: string, reason: 'ENDED' | 'CANCELLED' | 'DECLINED' = 'ENDED'): boolean {
  ensureReady();
  const now = Date.now();
  const invite = activeCallInvites.get(roomId);
  if (invite) {
    invite.status = reason;
    invite.updatedAt = now;
    activeCallInvites.set(invite.callId, invite);
    activeCallInvites.set(invite.roomId, invite);
  }
  const room = activeCallRooms.get(roomId);
  if (room) {
    room.status = 'ENDED';
  }
  schedulePersist();
  return Boolean(invite || room);
}

export function getRoomPollState(
  roomId: string,
  peerId: string,
  lastCandidateIndex: number = 0,
  lastEventTimestamp: number = 0,
  fallbackRole?: 'caller' | 'callee'
) {
  ensureReady();
  cleanStaleInvites();
  const room = activeCallRooms.get(roomId);
  const invite = activeCallInvites.get(roomId);

  if (!room) {
    if (invite && (invite.status === 'DECLINED' || invite.status === 'CANCELLED' || invite.status === 'ENDED')) {
      return {
        success: true,
        status: 'ENDED' as const,
        roomStatus: 'cancelled',
        inviteStatus: invite.status,
        role: fallbackRole || 'observer',
        hasPartner: false,
        offer: undefined,
        answer: undefined,
        candidates: [],
        nextCandidateIndex: lastCandidateIndex,
        events: []
      };
    }
    return { error: 'Room not found' };
  }

  const isCaller = peerId === room.callerId || (fallbackRole === 'caller' && peerId !== room.calleeId);
  const isCallee = peerId === room.calleeId || (fallbackRole === 'callee' && peerId !== room.callerId);
  const hasPartner = Boolean(room.callerId && room.calleeId);

  let incomingCandidates: any[] = [];
  let totalCandidatesAvailable = 0;

  if (isCaller) {
    incomingCandidates = room.calleeCandidates.slice(lastCandidateIndex);
    totalCandidatesAvailable = room.calleeCandidates.length;
  } else if (isCallee) {
    incomingCandidates = room.callerCandidates.slice(lastCandidateIndex);
    totalCandidatesAvailable = room.callerCandidates.length;
  }

  const incomingEvents = (room.events || []).filter(
    e => e.senderPeerId !== peerId && e.timestamp > lastEventTimestamp
  );

  const inviteStatus = invite?.status;
  const remoteEnded =
    room.status === 'ENDED' ||
    inviteStatus === 'DECLINED' ||
    inviteStatus === 'CANCELLED' ||
    inviteStatus === 'ENDED';

  return {
    success: true,
    status: room.status,
    roomStatus: remoteEnded ? 'cancelled' : room.status,
    inviteStatus,
    role: isCaller ? 'caller' : isCallee ? 'callee' : 'observer',
    hasPartner,
    offer: isCallee ? room.offer : undefined,
    answer: isCaller ? room.answer : undefined,
    partnerName: (isCaller ? room.calleeName : room.callerName) || undefined,
    partnerPhoto: (isCaller ? room.calleePhoto : room.callerPhoto) || undefined,
    candidates: incomingCandidates,
    nextCandidateIndex: totalCandidatesAvailable,
    events: incomingEvents
  };
}

export function leaveRoom(roomId: string, peerId: string) {
  ensureReady();
  const room = activeCallRooms.get(roomId);
  if (!room) return;

  if (room.callerId === peerId) {
    room.callerId = null;
    room.offer = null;
    room.callerCandidates = [];
  } else if (room.calleeId === peerId) {
    room.calleeId = null;
    room.answer = null;
    room.calleeCandidates = [];
  }

  if (!room.callerId && !room.calleeId && room.status !== 'ENDED') {
    room.status = 'WAITING';
  }
  schedulePersist();
}

export function initiateCallInvite(data: {
  roomId: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  calleeId: string;
  calleeName?: string;
  calleeEmail?: string;
  callMode: 'voice' | 'video';
  roomUrl?: string;
}): ActiveCallInvite {
  ensureReady();
  cleanStaleInvites();
  const now = Date.now();

  const existingInvite = activeCallInvites.get(data.roomId);
  const isSameInFlightInvite = Boolean(
    existingInvite &&
    existingInvite.status === 'RINGING' &&
    existingInvite.callerId === data.callerId &&
    now - existingInvite.createdAt < 45_000
  );

  if (isSameInFlightInvite && existingInvite) {
    if (data.callerName) existingInvite.callerName = data.callerName;
    if (data.callerPhoto) existingInvite.callerPhoto = data.callerPhoto;
    if (data.calleeName) existingInvite.calleeName = data.calleeName;
    if (data.calleeEmail) existingInvite.calleeEmail = data.calleeEmail;
    if (data.callMode) existingInvite.callMode = data.callMode;
    if (data.roomUrl) existingInvite.roomUrl = data.roomUrl;
    existingInvite.updatedAt = now;
    schedulePersist();
    return existingInvite;
  }

  for (const [id, inv] of activeCallInvites.entries()) {
    if (inv.roomId === data.roomId || (inv.calleeId === data.calleeId && inv.callerId === data.callerId)) {
      activeCallInvites.delete(id);
    }
  }

  const existingRoom = activeCallRooms.get(data.roomId);
  if (existingRoom) {
    existingRoom.callerId = null;
    existingRoom.calleeId = null;
    existingRoom.offer = null;
    existingRoom.answer = null;
    existingRoom.callerCandidates = [];
    existingRoom.calleeCandidates = [];
    existingRoom.events = [];
    existingRoom.status = 'WAITING';
    existingRoom.createdAt = now;
  }

  const callId = `call_inv_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const invite: ActiveCallInvite = {
    callId,
    roomId: data.roomId,
    callerId: data.callerId,
    callerName: data.callerName || 'Exclusive Member',
    callerPhoto: data.callerPhoto || '',
    calleeId: data.calleeId,
    calleeName: data.calleeName || '',
    calleeEmail: data.calleeEmail || '',
    callMode: data.callMode || 'video',
    status: 'RINGING',
    createdAt: now,
    updatedAt: now,
    roomUrl: data.roomUrl
  };

  activeCallInvites.set(data.roomId, invite);
  activeCallInvites.set(callId, invite);
  schedulePersist();
  return invite;
}

export function getIncomingCallForUser(
  userId?: string,
  userEmail?: string,
  extraIds: string[] = []
): ActiveCallInvite | null {
  ensureReady();
  cleanStaleInvites();

  const ids = new Set(
    [userId, ...extraIds]
      .map((id) => String(id || '').trim())
      .filter(Boolean)
  );
  const cleanEmail = String(userEmail || '').trim().toLowerCase();
  if (ids.size === 0 && !cleanEmail) return null;

  const now = Date.now();
  for (const invite of activeCallInvites.values()) {
    const matchId = Boolean(invite.calleeId && ids.has(invite.calleeId));
    const matchEmail = Boolean(
      cleanEmail && invite.calleeEmail && invite.calleeEmail.toLowerCase() === cleanEmail
    );

    if ((matchId || matchEmail) && invite.status === 'RINGING' && now - invite.createdAt < 45_000) {
      return invite;
    }
  }
  return null;
}

export function getCallInvite(roomIdOrCallId: string): ActiveCallInvite | null {
  ensureReady();
  cleanStaleInvites();
  if (!roomIdOrCallId) return null;
  return activeCallInvites.get(roomIdOrCallId) || null;
}

export function acceptCallInvite(roomIdOrCallId: string, calleeId?: string): boolean {
  ensureReady();
  const invite = activeCallInvites.get(roomIdOrCallId);
  if (!invite) return false;
  invite.status = 'ACCEPTED';
  invite.updatedAt = Date.now();
  if (calleeId && !invite.calleeId) invite.calleeId = calleeId;
  schedulePersist();
  return true;
}

export function declineCallInvite(roomIdOrCallId: string, calleeId?: string): boolean {
  return endCallSession(activeCallInvites.get(roomIdOrCallId)?.roomId || roomIdOrCallId, 'DECLINED');
}

export function cancelCallInvite(roomIdOrCallId: string, callerId?: string): boolean {
  return endCallSession(activeCallInvites.get(roomIdOrCallId)?.roomId || roomIdOrCallId, 'CANCELLED');
}
