// Naughty Zone — Live Photo Competition Arena & Leaderboard Store
// Strictly Non-Nude, High-Glam, Seductive, Fashion & Swimwear Race

import { MemberProfile } from './mockData';

export interface NaughtyPost {
  id: string;
  author: MemberProfile;
  image: string;
  caption: string;
  tags: string[];
  city: string;
  likesCount: number;
  hasLiked: boolean;
  dmsCount: number;
  diamondsTipped: number;
  rank: number;
  createdAt: string;
  badge?: string;
  aspectRatio?: 'square' | 'portrait' | 'tall';
}

export const NAUGHTY_TAGS = [
  '#SexyWears',
  '#AlluringGlam',
  '#BikiniGoddess',
  '#SeductiveFits',
  '#NightlifeSizzle',
  '#LuxuryLingerie',
  '#RedCarpetElegance',
  '#PoolsideVibes',
  '#FitAndGlow',
  '#EnuguFinest',
  '#LagosNights'
];

export const PRIZE_POOL_NAIRA = '₦100,000';
export const PRIZE_POOL_DIAMONDS = 1000;

const INITIAL_POSTS: NaughtyPost[] = [];

// Global in-memory singleton to persist across server-side hot reloads
const globalForNaughty = globalThis as unknown as {
  naughtyPosts?: NaughtyPost[];
};

globalForNaughty.naughtyPosts = [];

export function recalculateRanks(): void {
  if (!globalForNaughty.naughtyPosts) return;
  
  // Sort posts primarily by likes, then DMs, then diamonds
  globalForNaughty.naughtyPosts.sort((a, b) => {
    const scoreA = a.likesCount * 2 + a.dmsCount * 3 + a.diamondsTipped;
    const scoreB = b.likesCount * 2 + b.dmsCount * 3 + b.diamondsTipped;
    return scoreB - scoreA;
  });

  globalForNaughty.naughtyPosts.forEach((post, index) => {
    post.rank = index + 1;
    if (post.rank === 1) {
      post.badge = '👑 Current #1';
    } else if (post.rank === 2) {
      post.badge = '🥈 Silver Crown';
    } else if (post.rank === 3) {
      post.badge = '🥉 Bronze Crown';
    } else {
      delete post.badge;
    }
  });
}

export function getNaughtyPosts(filter: 'trending' | 'dms' | 'latest' = 'trending', cityFilter: string = 'all'): NaughtyPost[] {
  let posts = [...(globalForNaughty.naughtyPosts || INITIAL_POSTS)];

  if (cityFilter && cityFilter !== 'all') {
    posts = posts.filter(p => p.city.toLowerCase() === cityFilter.toLowerCase() || p.author.location.toLowerCase().includes(cityFilter.toLowerCase()));
  }

  if (filter === 'trending') {
    // Already sorted by overall race score
    recalculateRanks();
    return posts.sort((a, b) => a.rank - b.rank);
  } else if (filter === 'dms') {
    return posts.sort((a, b) => b.dmsCount - a.dmsCount);
  } else if (filter === 'latest') {
    return posts;
  }

  return posts;
}

export function toggleLikeNaughtyPost(postId: string): { success: boolean; post?: NaughtyPost } {
  const post = globalForNaughty.naughtyPosts?.find(p => p.id === postId);
  if (!post) return { success: false };

  if (post.hasLiked) {
    post.hasLiked = false;
    post.likesCount = Math.max(0, post.likesCount - 1);
  } else {
    post.hasLiked = true;
    post.likesCount += 1;
  }

  recalculateRanks();
  return { success: true, post };
}

export function incrementPostDMs(postId: string): { success: boolean; post?: NaughtyPost } {
  const post = globalForNaughty.naughtyPosts?.find(p => p.id === postId);
  if (!post) return { success: false };

  post.dmsCount += 1;
  recalculateRanks();
  return { success: true, post };
}

export function tipNaughtyPost(postId: string, diamonds: number): { success: boolean; post?: NaughtyPost } {
  const post = globalForNaughty.naughtyPosts?.find(p => p.id === postId);
  if (!post) return { success: false };

  post.diamondsTipped += diamonds;
  recalculateRanks();
  return { success: true, post };
}

export function createNaughtyPost(data: {
  image: string;
  caption: string;
  tags: string[];
  city: string;
}): { success: boolean; post: NaughtyPost } {
  // Current user representation
  const userProfile: MemberProfile = {
    id: 'user-me',
    name: 'Verified Member',
    age: 34,
    location: `${data.city || 'Enugu'}, Nigeria`,
    occupation: 'Industrial Manufacturing Executive',
    education: 'Oxford Alum',
    bio: 'Avid classic car collector & coastal sunset lover.',
    height: "6'1\"",
    verified: true,
    tier: 'ELITE',
    compatibility: 99,
    relationshipGoals: 'Marriage & life partner',
    photos: [data.image],
    interests: ['Luxury Lifestyle', 'Travel', 'Art'],
    lifestyle: { travel: 'Frequent', drink: 'Fine Spirits', workout: 'Squash', pets: 'Dog' },
    online: true,
    distance: 'Just now'
  };

  const newPost: NaughtyPost = {
    id: `post-${Date.now()}`,
    author: userProfile,
    image: data.image,
    caption: data.caption,
    tags: data.tags.length > 0 ? data.tags : ['#AlluringGlam', '#EnuguFinest'],
    city: data.city || 'Enugu',
    likesCount: 1, // Author's initial boost
    hasLiked: true,
    dmsCount: 0,
    diamondsTipped: 0,
    rank: (globalForNaughty.naughtyPosts?.length || 0) + 1,
    createdAt: 'Just now',
    aspectRatio: 'portrait'
  };

  if (!globalForNaughty.naughtyPosts) {
    globalForNaughty.naughtyPosts = [];
  }

  globalForNaughty.naughtyPosts.unshift(newPost);
  recalculateRanks();

  return { success: true, post: newPost };
}

export function deleteNaughtyPost(postId: string): boolean {
  if (!globalForNaughty.naughtyPosts) return false;
  const initialLen = globalForNaughty.naughtyPosts.length;
  globalForNaughty.naughtyPosts = globalForNaughty.naughtyPosts.filter(p => p.id !== postId);
  recalculateRanks();
  return globalForNaughty.naughtyPosts.length < initialLen;
}

export function featureNaughtyPost(postId: string, topRank: number = 1): boolean {
  const post = globalForNaughty.naughtyPosts?.find(p => p.id === postId);
  if (!post) return false;
  post.likesCount += 500;
  post.diamondsTipped += 1000;
  recalculateRanks();
  return true;
}
