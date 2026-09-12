// Central Persistent Call History Store
// Kiss My Cheek — Exclusive Dating & Social Club

export interface CallHistoryItem {
  id: string;
  callerId?: string;
  receiverId?: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string;
  partnerOccupation: string;
  callType: 'video' | 'voice';
  durationSeconds: number;
  durationFormatted: string;
  timestamp: string;
  status: 'completed' | 'missed' | 'declined';
  qualityPreset: '4k' | '1080p' | 'standard';
  createdAt?: string;
}

function getCallPersistencePath(): string | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'persistent_call_history.json');
  } catch {
    return null;
  }
}

const DEFAULT_CALL_HISTORY: CallHistoryItem[] = [];

export function getPersistentCallHistory(): CallHistoryItem[] {
  const filePath = getCallPersistencePath();
  if (!filePath) return DEFAULT_CALL_HISTORY;

  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CALL_HISTORY, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Call history read error:', err);
  }
  return DEFAULT_CALL_HISTORY;
}

export function savePersistentCallHistory(history: CallHistoryItem[]): void {
  const filePath = getCallPersistencePath();
  if (!filePath) return;
  try {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Call history write error:', err);
  }
}

export function addCallRecord(record: Omit<CallHistoryItem, 'id'>): CallHistoryItem {
  const history = getPersistentCallHistory();
  const newRecord: CallHistoryItem = {
    ...record,
    id: `call-rec-${Date.now()}`,
    createdAt: record.createdAt || new Date().toISOString()
  };
  history.unshift(newRecord);
  savePersistentCallHistory(history);
  return newRecord;
}

export function getCallHistoryBetweenUsers(userAId: string, userBId: string): CallHistoryItem[] {
  const history = getPersistentCallHistory();
  const a = String(userAId || '').trim();
  const b = String(userBId || '').trim();
  if (!a && !b) return [];

  // If one side is generic or unspecified, match by the known partner
  if (!a || a === 'user-me') {
    return history.filter(item => item.partnerId === b || item.callerId === b || item.receiverId === b);
  }
  if (!b || b === 'user-me') {
    return history.filter(item => item.partnerId === a || item.callerId === a || item.receiverId === a);
  }

  return history.filter(item => {
    // Match by direct caller/receiver pair
    const matchCallerReceiver = 
      (item.callerId === a && item.receiverId === b) ||
      (item.callerId === b && item.receiverId === a);

    if (matchCallerReceiver) return true;

    // Match by partnerId
    const matchPartner = item.partnerId === a || item.partnerId === b || item.receiverId === a || item.receiverId === b;
    return matchPartner;
  });
}

export function getCallHistoryForUser(userId: string): CallHistoryItem[] {
  const history = getPersistentCallHistory();
  const u = String(userId || '').trim();
  if (!u) return history;

  return history.filter(item => 
    item.callerId === u || 
    item.receiverId === u || 
    item.partnerId === u || 
    !item.callerId
  );
}

