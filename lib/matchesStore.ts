// Central Persistent Matches & Swipes History Store
// Kiss My Cheek — Exclusive Dating & Social Club

import { MemberProfile } from './mockData';
import { getAllStoredUsers } from './usersStore';

export interface MatchesStoreData {
  likedYou: MemberProfile[];
  mutual: MemberProfile[];
  youLiked: MemberProfile[];
  expiring: MemberProfile[];
  passedUserIds: string[];
}

function getMatchesPersistencePath(): string | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'persistent_matches_history.json');
  } catch {
    return null;
  }
}

const DEFAULT_MATCHES_DATA: MatchesStoreData = {
  likedYou: [],
  mutual: [],
  youLiked: [],
  expiring: [],
  passedUserIds: []
};

export function getPersistentMatches(): MatchesStoreData {
  const filePath = getMatchesPersistencePath();
  if (!filePath) return DEFAULT_MATCHES_DATA;

  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.likedYou) && Array.isArray(parsed.mutual)) {
        return parsed;
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_MATCHES_DATA, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Matches history read error:', err);
  }
  return DEFAULT_MATCHES_DATA;
}

export function savePersistentMatches(data: MatchesStoreData): void {
  const filePath = getMatchesPersistencePath();
  if (!filePath) return;
  try {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Matches history write error:', err);
  }
}

export function recordMatchAction(targetUserId: string, action: 'like' | 'pass' | 'superlike'): {
  isMatch: boolean;
  matchDetails: any;
  updatedStore: MatchesStoreData;
} {
  const store = getPersistentMatches();
  const storedUser = getAllStoredUsers().find(u => u.id === targetUserId);
  const targetProfile: MemberProfile | undefined = storedUser ? {
    id: storedUser.id,
    name: storedUser.profile?.fullName || 'Club Member',
    age: 28,
    location: storedUser.profile?.location || 'Nigeria',
    occupation: storedUser.profile?.occupation || 'Member',
    education: storedUser.profile?.education || 'Verified Member',
    bio: storedUser.profile?.bio || '',
    height: "5'10\"",
    verified: storedUser.isVerified,
    tier: storedUser.membershipTier,
    compatibility: 95,
    relationshipGoals: 'Exclusive Relationship',
    photos: storedUser.profile?.photos || [],
    interests: [],
    lifestyle: { travel: '', drink: '', workout: '', pets: '' },
    online: true,
    distance: ''
  } : undefined;

  if (action === 'pass') {
    if (!store.passedUserIds.includes(targetUserId)) {
      store.passedUserIds.push(targetUserId);
    }
    store.likedYou = store.likedYou.filter(p => p.id !== targetUserId);
    savePersistentMatches(store);
    return { isMatch: false, matchDetails: null, updatedStore: store };
  }

  // Like or Superlike
  const alreadyInLikedYou = store.likedYou.some(p => p.id === targetUserId);

  if (alreadyInLikedYou && targetProfile) {
    // Mutual match established!
    store.likedYou = store.likedYou.filter(p => p.id !== targetUserId);
    if (!store.mutual.some(p => p.id === targetUserId)) {
      store.mutual.unshift(targetProfile);
    }
    savePersistentMatches(store);
    return {
      isMatch: true,
      matchDetails: {
        matchId: `match-${Date.now()}`,
        matchedAt: new Date().toISOString(),
        celebrationPrompt: "It's a Mutual Connection ✨"
      },
      updatedStore: store
    };
  }

  // Add to youLiked
  if (targetProfile && !store.youLiked.some(p => p.id === targetUserId)) {
    store.youLiked.unshift(targetProfile);
  }

  savePersistentMatches(store);
  return { isMatch: false, matchDetails: null, updatedStore: store };
}
