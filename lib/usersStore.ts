// Central Persistent Users Store for local/fallback persistence
// Kiss My Cheek — Exclusive Dating & Social Club

import fs from 'fs';
import path from 'path';
import { hashPassword } from './auth';

export interface StoredUser {
  id: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: 'MEMBER' | 'VIP' | 'ADMIN';
  membershipTier: 'ESSENTIAL' | 'PREMIUM' | 'ELITE';
  isVerified: boolean;
  credits?: number;
  createdAt: string;
  profile?: {
    fullName: string;
    customName?: string;
    dob: string;
    gender: string;
    pronouns?: string;
    location: string;
    phone?: string;
    occupation?: string;
    education?: string;
    bio?: string;
    height?: string;
    relationshipGoals?: string;
    photos?: string[];
    interests?: string[];
  };
}

function getUsersPersistencePath(): string | null {
  if (typeof window !== 'undefined') return null;
  try {
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'users.json');
  } catch {
    return null;
  }
}

export function getAllStoredUsers(): StoredUser[] {
  const filePath = getUsersPersistencePath();
  let users: StoredUser[] = [];

  if (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          users = parsed.map(u => ({
            ...u,
            profile: u.profile ? {
              ...u.profile,
              photos: (u.profile.photos || []).filter((p: string) => p && p !== '/crown-gold.png')
            } : u.profile
          }));
        }
      }
    } catch (err) {
      console.warn('Users store read error:', err);
    }
  }

  return users;
}

export function saveStoredUsers(users: StoredUser[]): void {
  const filePath = getUsersPersistencePath();
  if (!filePath) return;
  try {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Users store write error:', err);
  }
}

export function findStoredUserByEmail(email: string): StoredUser | null {
  const users = getAllStoredUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function createStoredUser(userData: Omit<StoredUser, 'createdAt'>): StoredUser {
  const users = getAllStoredUsers();
  const newUser: StoredUser = {
    ...userData,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveStoredUsers(users);
  return newUser;
}

export function findStoredUserById(id: string): StoredUser | null {
  const users = getAllStoredUsers();
  return users.find(u => u.id === id) || null;
}

export function updateStoredUserPassword(email: string, newPasswordHash: string): boolean {
  const users = getAllStoredUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return false;
  user.passwordHash = newPasswordHash;
  saveStoredUsers(users);
  return true;
}

export function updateStoredUserProfile(
  identifier: string, // userId or email
  profileUpdates: Partial<NonNullable<StoredUser['profile']>> & { membershipTier?: StoredUser['membershipTier']; isVerified?: boolean }
): boolean {
  const users = getAllStoredUsers();
  const cleanId = String(identifier || '').trim().toLowerCase();
  
  let user = users.find(u => 
    (cleanId && (u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId)) ||
    u.id === identifier ||
    u.email === identifier
  );

  const cleanPhotos = profileUpdates.photos 
    ? profileUpdates.photos.filter((p: string) => p && p !== '/crown-gold.png')
    : undefined;

  if (!user) {
    if (identifier) {
      const newUser: StoredUser = {
        id: identifier,
        email: identifier.includes('@') ? identifier : `${identifier}@kissmycheek.org`,
        passwordHash: '',
        role: 'MEMBER',
        membershipTier: profileUpdates.membershipTier || 'ESSENTIAL',
        isVerified: profileUpdates.isVerified ?? true,
        createdAt: new Date().toISOString(),
        profile: {
          fullName: profileUpdates.fullName || 'Club Member',
          dob: profileUpdates.dob || '1998-01-01',
          gender: profileUpdates.gender || 'Woman',
          location: profileUpdates.location || 'Nigeria',
          ...profileUpdates,
          ...(cleanPhotos ? { photos: cleanPhotos } : {})
        }
      };
      users.push(newUser);
      saveStoredUsers(users);
      return true;
    }
    return false;
  }

  if (profileUpdates.membershipTier) {
    user.membershipTier = profileUpdates.membershipTier;
  }
  if (profileUpdates.isVerified !== undefined) {
    user.isVerified = profileUpdates.isVerified;
  }

  if (!user.profile) {
    user.profile = {
      fullName: 'Club Member',
      dob: '1998-01-01',
      gender: 'Woman',
      location: 'Nigeria'
    };
  }

  Object.assign(user.profile, profileUpdates);
  if (cleanPhotos !== undefined) {
    user.profile.photos = cleanPhotos;
  }
  saveStoredUsers(users);
  return true;
}

export function updateStoredUserCredits(
  identifier: string,
  amount: number,
  isAbsolute: boolean = false,
  secondaryIdentifier?: string
): number {
  const users = getAllStoredUsers();
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanSec = secondaryIdentifier ? String(secondaryIdentifier).trim().toLowerCase() : '';
  
  let user = users.find(u => 
    (cleanId && (u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId)) ||
    (cleanSec && (u.id.toLowerCase() === cleanSec || u.email.toLowerCase() === cleanSec)) ||
    u.id === identifier ||
    u.email === identifier
  );

  if (!user) {
    const newUser: StoredUser = {
      id: identifier,
      email: identifier.includes('@') ? identifier : (secondaryIdentifier?.includes('@') ? secondaryIdentifier : `${identifier}@kissmycheek.org`),
      passwordHash: '',
      role: 'MEMBER',
      membershipTier: 'ESSENTIAL',
      isVerified: true,
      credits: Math.max(0, isAbsolute ? amount : (500 + amount)),
      createdAt: new Date().toISOString(),
      profile: {
        fullName: 'Club Member',
        dob: '1998-01-01',
        gender: 'Woman',
        location: 'Verified Member'
      }
    };
    users.push(newUser);
    saveStoredUsers(users);
    return newUser.credits || 0;
  }

  const current = Number(user.credits !== undefined ? user.credits : 500);
  const updated = isAbsolute ? amount : (current + amount);
  user.credits = Math.max(0, updated);
  saveStoredUsers(users);
  return user.credits;
}

export function getStoredUserCredits(identifier: string, secondaryIdentifier?: string): number {
  const users = getAllStoredUsers();
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanSec = secondaryIdentifier ? String(secondaryIdentifier).trim().toLowerCase() : '';
  
  const user = users.find(u => 
    (cleanId && (u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId)) ||
    (cleanSec && (u.id.toLowerCase() === cleanSec || u.email.toLowerCase() === cleanSec)) ||
    u.id === identifier ||
    u.email === identifier
  );
  return user?.credits !== undefined ? user.credits : 500;
}



