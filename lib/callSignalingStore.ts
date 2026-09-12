// In-memory WebRTC Signaling Store for Kiss My Cheek Live 2-Way Video Calling
// Ensures instant, rock-solid P2P connection exchange without database dependencies

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
  status: 'WAITING' | 'CONNECTING' | 'CONNECTED' | 'ENDED';
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
  status: 'RINGING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'ENDED';
  createdAt: number;
  updatedAt: number;
}

const globalForCallSignaling = globalThis as unknown as {
  activeCallRooms?: Map<string, CallRoom>;
  activeCallInvites?: Map<string, ActiveCallInvite>;
};

if (!globalForCallSignaling.activeCallRooms) {
  globalForCallSignaling.activeCallRooms = new Map<string, CallRoom>();
}

if (!globalForCallSignaling.activeCallInvites) {
  globalForCallSignaling.activeCallInvites = new Map<string, ActiveCallInvite>();
}

export const activeCallRooms = globalForCallSignaling.activeCallRooms!;
export const activeCallInvites = globalForCallSignaling.activeCallInvites!;

// Auto-purge rooms older than 4 hours
function cleanStaleRooms() {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [id, room] of activeCallRooms.entries()) {
    if (room.createdAt < cutoff) {
      activeCallRooms.delete(id);
    }
  }
}

// Auto-purge call invites older than 60 seconds
export function cleanStaleInvites() {
  const now = Date.now();
  for (const [id, invite] of activeCallInvites.entries()) {
    // Purge ringing invites older than 45 seconds
    if (invite.status === 'RINGING' && now - invite.createdAt > 45000) {
      activeCallInvites.delete(id);
    } else if (invite.status !== 'RINGING' && now - invite.updatedAt > 15000) {
      activeCallInvites.delete(id);
    }
  }
}

export function getCanonicalRoomId(userA: string, userB: string): string {
  const cleanA = String(userA || '').trim();
  const cleanB = String(userB || '').trim();
  if (!cleanA && !cleanB) return `call_room_${Date.now()}`;
  if (!cleanA) return `call_${cleanB}`;
  if (!cleanB) return `call_${cleanA}`;
  const sorted = [cleanA, cleanB].sort();
  return `call_${sorted[0]}__${sorted[1]}`;
}

export function getOrCreateRoom(roomId: string): CallRoom {
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

  // If this peer is already registered
  if (room.callerId === peerId) {
    role = 'caller';
  } else if (room.calleeId === peerId) {
    role = 'callee';
  } else if (preferredRole === 'caller') {
    // Caller joined/re-joined: if new peerId, reset stale session signals
    if (room.callerId !== peerId) {
      room.callerId = peerId;
      room.offer = null;
      room.answer = null;
      room.callerCandidates = [];
      room.calleeCandidates = [];
      room.events = [];
      room.status = 'WAITING';
    }
    role = 'caller';
  } else if (preferredRole === 'callee') {
    // Callee joined/re-joined
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

  // Update peer name & photo
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

  // Inherit from active invite if available
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
  return true;
}

export function setRoomAnswer(roomId: string, peerId: string, answer: any): boolean {
  const room = getOrCreateRoom(roomId);
  room.answer = answer;
  room.status = 'CONNECTED';
  return true;
}

export function addIceCandidate(roomId: string, peerId: string, candidate: any, fallbackRole?: 'caller' | 'callee'): boolean {
  const room = getOrCreateRoom(roomId);
  if (!candidate) return false;

  if (peerId === room.callerId || fallbackRole === 'caller') {
    room.callerCandidates.push(candidate);
    return true;
  }
  if (peerId === room.calleeId || fallbackRole === 'callee') {
    room.calleeCandidates.push(candidate);
    return true;
  }
  if (!room.callerId) {
    room.callerId = peerId;
    room.callerCandidates.push(candidate);
    return true;
  }
  if (!room.calleeId && peerId !== room.callerId) {
    room.calleeId = peerId;
    room.calleeCandidates.push(candidate);
    return true;
  }
  return false;
}

export function addIceCandidates(roomId: string, peerId: string, candidates: any[], fallbackRole?: 'caller' | 'callee'): boolean {
  const room = getOrCreateRoom(roomId);
  if (!Array.isArray(candidates) || candidates.length === 0) return false;

  if (peerId === room.callerId || fallbackRole === 'caller') {
    room.callerCandidates.push(...candidates);
    return true;
  }
  if (peerId === room.calleeId || fallbackRole === 'callee') {
    room.calleeCandidates.push(...candidates);
    return true;
  }
  if (!room.callerId) {
    room.callerId = peerId;
    room.callerCandidates.push(...candidates);
    return true;
  }
  if (!room.calleeId && peerId !== room.callerId) {
    room.calleeId = peerId;
    room.calleeCandidates.push(...candidates);
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
  return true;
}

export function getRoomPollState(
  roomId: string,
  peerId: string,
  lastCandidateIndex: number = 0,
  lastEventTimestamp: number = 0,
  fallbackRole?: 'caller' | 'callee'
) {
  const room = activeCallRooms.get(roomId);
  if (!room) {
    return { error: 'Room not found' };
  }

  const isCaller = peerId === room.callerId || fallbackRole === 'caller';
  const isCallee = peerId === room.calleeId || fallbackRole === 'callee';
  const hasPartner = Boolean(room.callerId && room.calleeId);

  // Candidates intended for this peer (from the other peer)
  let incomingCandidates: any[] = [];
  let totalCandidatesAvailable = 0;

  if (isCaller) {
    incomingCandidates = room.calleeCandidates.slice(lastCandidateIndex);
    totalCandidatesAvailable = room.calleeCandidates.length;
  } else if (isCallee) {
    incomingCandidates = room.callerCandidates.slice(lastCandidateIndex);
    totalCandidatesAvailable = room.callerCandidates.length;
  }

  // Real-time events from the other peer (reactions, icebreakers, mic/cam mute state)
  const incomingEvents = (room.events || []).filter(
    e => e.senderPeerId !== peerId && e.timestamp > lastEventTimestamp
  );

  return {
    success: true,
    status: room.status,
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

  if (!room.callerId && !room.calleeId) {
    activeCallRooms.delete(roomId);
  } else {
    room.status = 'WAITING';
  }
}

// Call Invite Signal Handlers
export function initiateCallInvite(data: {
  roomId: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  calleeId: string;
  calleeName?: string;
  calleeEmail?: string;
  callMode: 'voice' | 'video';
}): ActiveCallInvite {
  cleanStaleInvites();
  const now = Date.now();
  const callId = `call_inv_${now}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Clean previous invite for this room or callee
  for (const [id, inv] of activeCallInvites.entries()) {
    if (inv.roomId === data.roomId || (inv.calleeId === data.calleeId && inv.callerId === data.callerId)) {
      activeCallInvites.delete(id);
    }
  }

  // Reset any existing room state for this room ID so past call artifacts don't corrupt the new session
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
    updatedAt: now
  };

  activeCallInvites.set(data.roomId, invite);
  activeCallInvites.set(callId, invite);
  return invite;
}

export function getIncomingCallForUser(userId?: string, userEmail?: string, userName?: string): ActiveCallInvite | null {
  cleanStaleInvites();
  if (!userId && !userEmail && !userName) return null;
  const cleanId = String(userId || '').trim();
  const cleanEmail = String(userEmail || '').trim().toLowerCase();
  const cleanName = String(userName || '').trim().toLowerCase().replace(/\s+/g, '');
  const now = Date.now();

  for (const invite of activeCallInvites.values()) {
    const inviteCleanName = (invite.calleeName || '').toLowerCase().replace(/\s+/g, '');
    const matchId = cleanId && (invite.calleeId === cleanId || cleanId.includes(invite.calleeId) || invite.calleeId.includes(cleanId));
    const matchEmail = cleanEmail && invite.calleeEmail && invite.calleeEmail.toLowerCase() === cleanEmail;
    const matchName = cleanName && inviteCleanName && (
      inviteCleanName === cleanName ||
      cleanName.includes(inviteCleanName) ||
      inviteCleanName.includes(cleanName)
    );

    if (
      (matchId || matchEmail || matchName) &&
      invite.status === 'RINGING' &&
      now - invite.createdAt < 45000
    ) {
      return invite;
    }
  }
  return null;
}

export function getCallInvite(roomIdOrCallId: string): ActiveCallInvite | null {
  cleanStaleInvites();
  if (!roomIdOrCallId) return null;
  return activeCallInvites.get(roomIdOrCallId) || null;
}

export function acceptCallInvite(roomIdOrCallId: string, calleeId?: string): boolean {
  const invite = activeCallInvites.get(roomIdOrCallId);
  if (!invite) return false;
  invite.status = 'ACCEPTED';
  invite.updatedAt = Date.now();
  return true;
}

export function declineCallInvite(roomIdOrCallId: string, calleeId?: string): boolean {
  const invite = activeCallInvites.get(roomIdOrCallId);
  if (!invite) return false;
  invite.status = 'DECLINED';
  invite.updatedAt = Date.now();
  return true;
}

export function cancelCallInvite(roomIdOrCallId: string, callerId?: string): boolean {
  const invite = activeCallInvites.get(roomIdOrCallId);
  if (!invite) return false;
  invite.status = 'CANCELLED';
  invite.updatedAt = Date.now();
  return true;
}

