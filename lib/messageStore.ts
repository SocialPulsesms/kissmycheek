import { ConversationThread, ChatMessage, MessageReaction, MemberProfile } from './mockData';
import { getAllStoredUsers } from './usersStore';

export interface StoredParticipant {
  id: string;
  name: string;
  age?: number;
  location?: string;
  occupation?: string;
  photos?: string[];
  interests?: string[];
  tier?: string;
  online?: boolean;
}

export interface StoredConversation {
  id: string;
  user1Id: string;
  user2Id: string;
  participants: {
    [userId: string]: StoredParticipant;
  };
  lastMessage: string;
  lastMessageTime: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const MOCK_NAMES = [
  'Sophia Nwachukwu', 
  'Alexander Okonkwo', 
  'Lady Victoria', 
  'Zainab Al-Mansoor', 
  'Kelechi Eze',
  'Elena Rostova',
  'Aria Chen',
  'Sophia Sterling',
  'Alexander Wright',
  'Chidera Anya',
  'Adaeze Nwosu'
];

const MOCK_SNIPPETS = [
  'contemporary sculpture',
  'gallery opening',
  'piano acoustics',
  'Art Basel',
  'architectural renovation',
  'sunset cruise in Monaco',
  'performance rehearsal'
];

export function getCanonicalThreadId(userAId: string, userBId: string): string {
  const cleanA = String(userAId || '').trim();
  const cleanB = String(userBId || '').trim();
  if (!cleanA && !cleanB) return `th_conv_${Date.now()}`;
  if (!cleanA) return `th_${cleanB}`;
  if (!cleanB) return `th_${cleanA}`;
  const sorted = [cleanA, cleanB].sort();
  return `th_${sorted[0]}__${sorted[1]}`;
}

function isGenuineRealThread(t: any): boolean {
  if (!t) return false;
  const name1 = t.participant?.name || '';
  const pVals = t.participants ? Object.values(t.participants) : [];
  const hasMockName = MOCK_NAMES.includes(name1) || pVals.some((p: any) => MOCK_NAMES.includes(p?.name));
  if (hasMockName) return false;

  const threadId = String(t.id || '');
  if (threadId.startsWith('conv-') || threadId.startsWith('mock-')) return false;

  const partId = String(t.participant?.id || t.user2Id || '');
  if (partId.startsWith('prof-') || partId.startsWith('profile-') || partId.startsWith('usr_patron_') || partId.startsWith('usr_demo_') || partId.startsWith('usr_mock_')) return false;

  if (Array.isArray(t.messages)) {
    const hasMockSnippet = t.messages.some((m: any) => {
      const content = String(m?.content || '').toLowerCase();
      return MOCK_SNIPPETS.some(snip => content.includes(snip.toLowerCase()));
    });
    if (hasMockSnippet) return false;
  }

  return true;
}

function normalizeStoredConversation(raw: any): StoredConversation | null {
  if (!raw) return null;
  if (!isGenuineRealThread(raw)) return null;

  const u1 = raw.user1Id || (raw.participant?.id ? 'user-me' : 'user-1');
  const u2 = raw.user2Id || raw.participant?.id || 'user-2';
  const canonicalId = raw.id?.includes('__') ? raw.id : getCanonicalThreadId(u1, u2);

  const participants: { [key: string]: StoredParticipant } = raw.participants || {};
  
  if (raw.participant?.id && !participants[raw.participant.id]) {
    participants[raw.participant.id] = {
      id: raw.participant.id,
      name: raw.participant.name || 'Club Member',
      photos: raw.participant.photos || [],
      location: raw.participant.location || 'Verified Member',
      occupation: raw.participant.occupation || 'Member',
      age: raw.participant.age || 28,
      online: true
    };
  }

  return {
    id: canonicalId,
    user1Id: u1,
    user2Id: u2,
    participants,
    lastMessage: raw.lastMessage || 'Conversation initiated',
    lastMessageTime: raw.lastMessageTime || '',
    updatedAt: raw.updatedAt || new Date().toISOString(),
    messages: Array.isArray(raw.messages) ? raw.messages : []
  };
}

function loadPersistedStoredConversations(): StoredConversation[] {
  if (typeof window !== 'undefined') return [];
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    const messagesFile = path.join(dataDir, 'persistent_chat_history.json');
    if (fs.existsSync(messagesFile)) {
      const raw = fs.readFileSync(messagesFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalizedList: StoredConversation[] = [];
        const seenIds = new Set<string>();

        for (const item of parsed) {
          const norm = normalizeStoredConversation(item);
          if (norm && !seenIds.has(norm.id)) {
            seenIds.add(norm.id);
            normalizedList.push(norm);
          }
        }
        return normalizedList;
      }
    }
  } catch (err) {}
  return [];
}

export function savePersistedStoredConversations(conversations: StoredConversation[]) {
  if (typeof window !== 'undefined') return;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    const messagesFile = path.join(dataDir, 'persistent_chat_history.json');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(messagesFile, JSON.stringify(conversations, null, 2), 'utf-8');
  } catch (err) {}
}

// Global in-memory singleton
const globalForMessages = globalThis as unknown as {
  storedConversations?: StoredConversation[];
};

if (!globalForMessages.storedConversations) {
  globalForMessages.storedConversations = loadPersistedStoredConversations();
}

export const storedConversations = globalForMessages.storedConversations!;

/**
 * Format a StoredConversation into a ConversationThread for a specific viewer (currentUserId)
 */
export function formatConversationForUser(
  conv: StoredConversation, 
  currentUserId: string = 'user-me'
): ConversationThread {
  // Determine partner ID
  let partnerId = conv.user1Id === currentUserId ? conv.user2Id : conv.user1Id;
  
  if (partnerId === currentUserId) {
    // If user1Id and user2Id are ambiguous, pick the participant that isn't currentUserId
    const otherKey = Object.keys(conv.participants || {}).find(k => k !== currentUserId);
    if (otherKey) partnerId = otherKey;
  }

  // Lookup cached or store participant info
  let partner = conv.participants?.[partnerId];

  // Try enrichment from usersStore if missing full name or photos
  if (!partner || !partner.photos?.length || partner.name === 'Club Member') {
    try {
      const allUsers = getAllStoredUsers();
      const userRecord = allUsers.find(u => u.id === partnerId || u.email === partnerId);
      if (userRecord?.profile) {
        partner = {
          id: partnerId,
          name: userRecord.profile.fullName || userRecord.profile.customName || partner?.name || 'Club Member',
          photos: userRecord.profile.photos || partner?.photos || [],
          location: userRecord.profile.location || partner?.location || 'Verified Member',
          occupation: userRecord.profile.occupation || partner?.occupation || 'Member',
          age: partner?.age || 28,
          tier: userRecord.membershipTier || partner?.tier || 'STANDARD',
          online: true
        };
        // Update stored participant cache
        if (!conv.participants) conv.participants = {};
        conv.participants[partnerId] = partner;
      }
    } catch {}
  }

  const participantProfile: MemberProfile = {
    id: partnerId,
    name: partner?.name || 'Club Member',
    age: partner?.age || 28,
    location: partner?.location || 'Verified Member',
    occupation: partner?.occupation || 'Club Member',
    photos: partner?.photos || [],
    interests: partner?.interests || [],
    tier: (partner?.tier as any) || 'STANDARD',
    online: partner?.online ?? true
  };

  const unreadCount = conv.messages.filter(m => m.senderId === partnerId && !m.read).length;

  return {
    id: conv.id,
    participant: participantProfile,
    lastMessage: conv.lastMessage || 'Conversation initiated',
    lastMessageTime: conv.lastMessageTime || '',
    unreadCount,
    messages: conv.messages
  };
}

export function getConversationsForUser(currentUserId: string = 'user-me'): ConversationThread[] {
  const cleanUser = String(currentUserId || '').trim();
  
  const userConvs = storedConversations.filter(c => {
    if (!cleanUser || cleanUser === 'user-me') return true;
    return (
      c.user1Id === cleanUser || 
      c.user2Id === cleanUser || 
      (c.participants && cleanUser in c.participants) ||
      c.id.includes(cleanUser)
    );
  });

  return userConvs
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .map(c => formatConversationForUser(c, cleanUser));
}

export function getConversations(): ConversationThread[] {
  return storedConversations.map(c => formatConversationForUser(c, 'user-me'));
}

export function getConversationById(id: string, currentUserId: string = 'user-me'): ConversationThread | undefined {
  const conv = storedConversations.find(c => c.id === id || c.id.includes(id));
  if (!conv) return undefined;
  return formatConversationForUser(conv, currentUserId);
}

export function findThreadByParticipant(participantId: string, currentUserId: string = 'user-me'): ConversationThread | undefined {
  const canonicalId = getCanonicalThreadId(currentUserId, participantId);
  const conv = storedConversations.find(c => 
    c.id === canonicalId ||
    c.id === participantId || 
    c.id === `th-${participantId}` || 
    c.user1Id === participantId ||
    c.user2Id === participantId ||
    Boolean(c.participants?.[participantId])
  );
  if (!conv) return undefined;
  return formatConversationForUser(conv, currentUserId);
}

export function createOrGetConversationThread(
  senderIdOrThreadId: string,
  recipientIdOrData?: any,
  maybeRecipientData?: any,
  maybeSenderData?: any
): ConversationThread {
  let senderId = 'user-me';
  let recipientId = '';
  let recipientData: StoredParticipant | undefined;
  let senderData: StoredParticipant | undefined;

  // Polymorphic argument parsing
  if (typeof recipientIdOrData === 'string') {
    senderId = senderIdOrThreadId;
    recipientId = recipientIdOrData;
    recipientData = maybeRecipientData;
    senderData = maybeSenderData;
  } else if (typeof recipientIdOrData === 'object' && recipientIdOrData !== null) {
    recipientData = recipientIdOrData;
    recipientId = (recipientData as StoredParticipant)?.id || senderIdOrThreadId.replace(/^th[-_]/, '');
    senderId = maybeRecipientData || 'user-me';
  } else {
    recipientId = senderIdOrThreadId.replace(/^th[-_]/, '');
  }

  const canonicalId = getCanonicalThreadId(senderId, recipientId);

  let existing = storedConversations.find(c => 
    c.id === canonicalId ||
    (c.user1Id === senderId && c.user2Id === recipientId) ||
    (c.user1Id === recipientId && c.user2Id === senderId) ||
    (c.id === senderIdOrThreadId && senderIdOrThreadId.startsWith('th_'))
  );

  if (existing) {
    if (!existing.participants) existing.participants = {};

    if (recipientData && recipientId) {
      existing.participants[recipientId] = {
        id: recipientId,
        name: recipientData.name || existing.participants[recipientId]?.name || 'Club Member',
        photos: (recipientData.photos && recipientData.photos.length > 0) ? recipientData.photos : (existing.participants[recipientId]?.photos || []),
        location: recipientData.location || existing.participants[recipientId]?.location || 'Verified Member',
        occupation: recipientData.occupation || existing.participants[recipientId]?.occupation || 'Member',
        age: recipientData.age || existing.participants[recipientId]?.age || 28,
        online: true
      };
    }

    if (senderData && senderId) {
      existing.participants[senderId] = {
        id: senderId,
        name: senderData.name || existing.participants[senderId]?.name || 'Club Member',
        photos: (senderData.photos && senderData.photos.length > 0) ? senderData.photos : (existing.participants[senderId]?.photos || []),
        location: senderData.location || existing.participants[senderId]?.location || 'Verified Member',
        occupation: senderData.occupation || existing.participants[senderId]?.occupation || 'Member',
        age: senderData.age || existing.participants[senderId]?.age || 28,
        online: true
      };
    }

    savePersistedStoredConversations(storedConversations);
    return formatConversationForUser(existing, senderId);
  }

  // Create new genuine end-to-end conversation
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const participants: { [key: string]: StoredParticipant } = {};
  if (recipientId) {
    participants[recipientId] = {
      id: recipientId,
      name: recipientData?.name || 'Club Member',
      photos: recipientData?.photos || [],
      location: recipientData?.location || 'Verified Member',
      occupation: recipientData?.occupation || 'Member',
      age: recipientData?.age || 28,
      online: true
    };
  }
  if (senderId && senderId !== recipientId) {
    participants[senderId] = {
      id: senderId,
      name: senderData?.name || 'Club Member',
      photos: senderData?.photos || [],
      location: senderData?.location || 'Verified Member',
      occupation: senderData?.occupation || 'Member',
      age: senderData?.age || 28,
      online: true
    };
  }

  const newConv: StoredConversation = {
    id: canonicalId,
    user1Id: senderId,
    user2Id: recipientId,
    participants,
    lastMessage: 'Conversation initiated',
    lastMessageTime: timeString,
    updatedAt: now.toISOString(),
    messages: []
  };

  storedConversations.unshift(newConv);
  savePersistedStoredConversations(storedConversations);

  return formatConversationForUser(newConv, senderId);
}

export function toggleReactionOnMessage(
  threadId: string,
  messageId: string,
  emoji: string,
  userId: string = 'user-me'
): ConversationThread {
  const canonicalId = getCanonicalThreadId(userId, threadId);
  const conv = storedConversations.find(c => 
    c.id === threadId || 
    c.id === canonicalId ||
    c.id.includes(threadId) ||
    c.user1Id === threadId ||
    c.user2Id === threadId ||
    (c.participants && threadId in c.participants)
  );
  if (!conv) throw new Error('Thread not found');

  let msg = conv.messages.find(m => m.id === messageId);
  if (!msg && conv.messages.length > 0) {
    msg = conv.messages[conv.messages.length - 1];
  }
  if (!msg) throw new Error('Message not found');

  if (!msg.reactions || !Array.isArray(msg.reactions)) {
    msg.reactions = [];
  }

  const existing = msg.reactions.find(r => r.emoji === emoji);
  if (existing) {
    if (existing.userIds.includes(userId)) {
      existing.userIds = existing.userIds.filter(id => id !== userId);
      existing.count = existing.userIds.length;
      if (existing.count === 0) {
        msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      existing.userIds.push(userId);
      existing.count = existing.userIds.length;
    }
  } else {
    msg.reactions.push({
      emoji,
      count: 1,
      userIds: [userId]
    });
  }

  savePersistedStoredConversations(storedConversations);
  return formatConversationForUser(conv, userId);
}

export function postMessageToThread(
  threadIdOrSenderId: string, 
  content: string, 
  isVoiceNote: boolean = false, 
  mediaUrl?: string,
  mediaType: 'image' | 'sticker' | 'video' | 'audio' | 'call_log' = 'image',
  stickerCode?: string,
  participantData?: {
    id: string;
    name: string;
    photos?: string[];
    location?: string;
    occupation?: string;
    age?: number;
  },
  actualSenderId?: string,
  actualRecipientId?: string,
  actualSenderData?: {
    id: string;
    name: string;
    photos?: string[];
  },
  callData?: {
    callType?: 'voice' | 'video';
    callDuration?: string;
    callStatus?: 'completed' | 'missed' | 'declined';
  }
): { userMessage: ChatMessage; updatedThread: ConversationThread } {
  const senderId = actualSenderId || (threadIdOrSenderId.includes('__') ? threadIdOrSenderId.split('__')[0].replace(/^th_/, '') : 'user-me');
  const recipientId = actualRecipientId || participantData?.id || (threadIdOrSenderId.includes('__') ? threadIdOrSenderId.split('__')[1] : threadIdOrSenderId.replace(/^th[-_]/, ''));
  const canonicalId = getCanonicalThreadId(senderId, recipientId);

  let conv = storedConversations.find(c => 
    c.id === canonicalId ||
    c.id === threadIdOrSenderId ||
    (c.user1Id === senderId && c.user2Id === recipientId) ||
    (c.user1Id === recipientId && c.user2Id === senderId)
  );

  if (!conv) {
    createOrGetConversationThread(senderId, recipientId, participantData, actualSenderData);
    conv = storedConversations.find(c => c.id === canonicalId);
  }

  if (!conv) {
    throw new Error('Failed to initialize conversation thread');
  }

  // Auto-mark all previous incoming messages as read since sender is actively interacting
  conv.messages.forEach(m => {
    if (m.senderId !== senderId && !m.read) {
      m.read = true;
    }
  });

  // Update participant cache with latest photos and names
  if (recipientId && participantData) {
    if (!conv.participants) conv.participants = {};
    conv.participants[recipientId] = {
      id: recipientId,
      name: participantData.name || conv.participants[recipientId]?.name || 'Club Member',
      photos: (participantData.photos && participantData.photos.length > 0) ? participantData.photos : (conv.participants[recipientId]?.photos || []),
      location: participantData.location || conv.participants[recipientId]?.location || 'Verified Member',
      occupation: participantData.occupation || conv.participants[recipientId]?.occupation || 'Member',
      age: participantData.age || conv.participants[recipientId]?.age || 28,
      online: true
    };
  }

  if (senderId && actualSenderData) {
    if (!conv.participants) conv.participants = {};
    conv.participants[senderId] = {
      id: senderId,
      name: actualSenderData.name || conv.participants[senderId]?.name || 'Club Member',
      photos: (actualSenderData.photos && actualSenderData.photos.length > 0) ? actualSenderData.photos : (conv.participants[senderId]?.photos || []),
      location: conv.participants[senderId]?.location || 'Verified Member',
      occupation: conv.participants[senderId]?.occupation || 'Member',
      age: conv.participants[senderId]?.age || 28,
      online: true
    };
  }

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let displayContent = content;
  if (mediaType === 'call_log') {
    displayContent = content || `${callData?.callType === 'voice' ? '📞 Voice Call' : '📹 Video Date'} ended`;
  } else if (stickerCode) {
    displayContent = content || `Sent a sticker ${stickerCode}`;
  } else if (mediaUrl && !content) {
    displayContent = 'Shared a photo';
  } else if (isVoiceNote && !content) {
    displayContent = 'Voice note dispatched';
  }

  const resolvedMediaType = mediaType === 'call_log' 
    ? 'call_log' 
    : stickerCode 
      ? 'sticker' 
      : mediaUrl 
        ? 'image' 
        : isVoiceNote 
          ? 'audio' 
          : undefined;

  const userMessage: ChatMessage = {
    id: `m-usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: senderId, // Genuine sender user ID
    content: displayContent,
    timestamp: timeString,
    read: true,
    isVoiceNote,
    mediaUrl,
    mediaType: resolvedMediaType,
    stickerCode,
    voiceDuration: isVoiceNote ? '0:16' : undefined,
    callType: callData?.callType,
    callDuration: callData?.callDuration,
    callStatus: callData?.callStatus,
    reactions: []
  };

  conv.messages.push(userMessage);
  conv.lastMessage = displayContent;
  conv.lastMessageTime = timeString;
  conv.updatedAt = now.toISOString();

  savePersistedStoredConversations(storedConversations);

  return {
    userMessage,
    updatedThread: formatConversationForUser(conv, senderId)
  };
}

export function markThreadAsRead(threadId: string, currentUserId: string = 'user-me'): void {
  if (!threadId) return;
  const canonicalId = getCanonicalThreadId(currentUserId, threadId);
  const conv = storedConversations.find(c => 
    c.id === threadId || 
    c.id === canonicalId ||
    c.id.includes(threadId) ||
    c.user1Id === threadId ||
    c.user2Id === threadId ||
    (c.participants && threadId in c.participants)
  );
  if (!conv) return;

  let changed = false;
  conv.messages.forEach(m => {
    if (m.senderId !== currentUserId && !m.read) {
      m.read = true;
      changed = true;
    }
  });

  if (changed) {
    savePersistedStoredConversations(storedConversations);
  }
}
