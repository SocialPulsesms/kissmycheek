export interface MemberProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  occupation: string;
  education?: string;
  bio?: string;
  height?: string;
  verified?: boolean;
  tier?: 'ESSENTIAL' | 'PREMIUM' | 'ELITE';
  compatibility?: number;
  relationshipGoals?: string;
  photos: string[];
  videos?: string[];
  interests: string[];
  lifestyle?: {
    travel?: string;
    drink?: string;
    workout?: string;
    pets?: string;
  };
  online: boolean;
  distance?: string;
}

export interface ExclusiveEvent {
  id: string;
  title: string;
  subtitle: string;
  category: 'Gala' | 'VIP Party' | 'Retreat' | 'Dining' | 'Networking';
  date: string;
  time: string;
  location: string;
  city: string;
  image: string;
  price: string;
  attendeesCount: number;
  maxAttendees: number;
  description: string;
  isRsvped?: boolean;
  status: 'gathering_interest' | 'greenlit' | 'past';
  interestedCount: number;
  minInterestedMembers: number;
  interestedUserIds?: string[];
  hasInterested?: boolean;
  proposedBy?: string;
  targetDateNotice?: string;
  vipPreferences?: Array<{
    userId: string;
    foodPreferences: string[];
    drinkPreferences: string[];
    funPreferences: string[];
    notes?: string;
    submittedAt: string;
  }>;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isVoiceNote?: boolean;
  voiceDuration?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'sticker' | 'video' | 'audio' | 'call_log';
  callType?: 'voice' | 'video';
  callDuration?: string;
  callStatus?: 'completed' | 'missed' | 'declined';
  stickerCode?: string;
  reactions?: MessageReaction[];
  read: boolean;
}

export interface ConversationThread {
  id: string;
  participant: MemberProfile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}
export const MOCK_PROFILES: MemberProfile[] = [];

export const MOCK_EVENTS: ExclusiveEvent[] = [
  // 1. Lagos - Gathering Interest
  {
    id: 'event-1',
    title: 'The Eko Atlantic Midnight Masquerade & Gala',
    subtitle: 'Black-Tie Chamber Orchestra & Vintage Champagne Tasting',
    category: 'Gala',
    date: 'Saturday, Nov 14',
    time: '8:00 PM – 2:00 AM',
    location: 'Eko Hotels Grand Ballroom, Victoria Island',
    city: 'Lagos',
    image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1000&q=80',
    price: '₦250,000 / Ticket',
    attendeesCount: 0,
    maxAttendees: 60,
    description: 'An enchanting black-tie gathering in Victoria Island. Live chamber symphony, vintage champagne tasting, and introductions among verified club patrons.',
    isRsvped: false,
    status: 'gathering_interest',
    interestedCount: 0,
    minInterestedMembers: 50,
    interestedUserIds: [],
    hasInterested: false,
    proposedBy: 'Lagos Club Chapter',
    targetDateNotice: 'Needs 50 interested members to lock venue & date'
  },
  // 2. Abuja - Gathering Interest
  {
    id: 'event-2',
    title: 'Maitama Presidential Penthouse Cigar & Jazz Soirée',
    subtitle: 'Private Strategy Sessions, Fine Scotch & Live Saxophone',
    category: 'VIP Party',
    date: 'Targeting Mid-December',
    time: '7:30 PM – Midnight',
    location: 'Secret Diplomatic Penthouse, Maitama',
    city: 'Abuja',
    image: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1000&q=80',
    price: '₦180,000 / Ticket',
    attendeesCount: 0,
    maxAttendees: 40,
    description: 'An intimate diplomatic gathering overlooking Abuja skyline. Premium single malts, live acoustic jazz, and distinguished founders and executives.',
    isRsvped: false,
    status: 'gathering_interest',
    interestedCount: 0,
    minInterestedMembers: 50,
    interestedUserIds: [],
    hasInterested: false,
    proposedBy: 'Abuja Club Chapter',
    targetDateNotice: 'Needs 50 interested members to lock venue & date'
  },
  // 3. Enugu - Gathering Interest
  {
    id: 'event-3',
    title: 'Coal City Moonlight Masquerade & Wine Tasting',
    subtitle: 'Independence Layout Private Villa Poolside Gala',
    category: 'Gala',
    date: 'Targeting Early December',
    time: '6:30 PM – 1:00 AM',
    location: 'Private Hillside Villa, Independence Layout',
    city: 'Enugu',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80',
    price: '₦120,000 / Ticket',
    attendeesCount: 0,
    maxAttendees: 35,
    description: 'Elegance under the stars in Independence Layout. Live afro-jazz ensemble, sommelier wine flight, and exclusive social mingling for eastern patrons.',
    isRsvped: false,
    status: 'gathering_interest',
    interestedCount: 0,
    minInterestedMembers: 35,
    interestedUserIds: [],
    hasInterested: false,
    proposedBy: 'Enugu Club Chapter',
    targetDateNotice: 'Needs 35 interested members to lock venue & date'
  },
  // 4. Port Harcourt - Gathering Interest
  {
    id: 'event-4',
    title: 'The Garden City Waterside VIP Yacht Soirée',
    subtitle: 'Bonny River Sunset Cruise & Bespoke Cocktail Tasting',
    category: 'VIP Party',
    date: 'Targeting Late December',
    time: '5:30 PM – 10:30 PM',
    location: 'Port Harcourt Club Waterside, Old GRA',
    city: 'Port Harcourt',
    image: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1000&q=80',
    price: '₦150,000 / Ticket',
    attendeesCount: 0,
    maxAttendees: 30,
    description: 'Cruise along the scenic waterways with live acoustic saxophone, fresh Atlantic seafood canapés, and bespoke cocktails for verified patrons.',
    isRsvped: false,
    status: 'gathering_interest',
    interestedCount: 0,
    minInterestedMembers: 30,
    interestedUserIds: [],
    hasInterested: false,
    proposedBy: 'Rivers Club Chapter',
    targetDateNotice: 'Needs 30 interested members to lock yacht charter'
  },
  // 5. London - Gathering Interest
  {
    id: 'event-5',
    title: 'The Mayfair Rooftop Champagne Soirée',
    subtitle: 'Private Terrace Jazz & Haute Horlogerie Preview',
    category: 'VIP Party',
    date: 'Friday, Nov 27',
    time: '7:00 PM – Midnight',
    location: 'The Dorchester Rooftop, Mayfair',
    city: 'London',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80',
    price: '£350 / Ticket',
    attendeesCount: 0,
    maxAttendees: 45,
    description: 'An intimate evening overlooking Hyde Park. Connect with London and international members with private acoustic jazz and curated cellar pairings.',
    isRsvped: false,
    status: 'gathering_interest',
    interestedCount: 0,
    minInterestedMembers: 40,
    interestedUserIds: [],
    hasInterested: false,
    proposedBy: 'UK Ambassador Committee',
    targetDateNotice: 'Needs 40 interested members to lock venue & date'
  },
  // 6. Dubai - Gathering Interest
  {
    id: 'event-6',
    title: 'The Palm Jumeirah Sunset Superyacht Gathering',
    subtitle: 'Private Mega-Yacht Cruise & Seafood Degustation',
    category: 'VIP Party',
    date: 'Saturday, Dec 12',
    time: '5:00 PM – 11:00 PM',
    location: 'Dubai Marina Yacht Club / Palm Lagoon',
    city: 'Dubai',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=80',
    price: 'Complimentary for Elite Tier',
    attendeesCount: 0,
    maxAttendees: 40,
    description: 'Sail along the Dubai shoreline as the sun sets over the Arabian Gulf. Enjoy bespoke mixology, live saxophone, and high-caliber social introductions.',
    isRsvped: false,
    status: 'gathering_interest',
    interestedCount: 0,
    minInterestedMembers: 35,
    interestedUserIds: [],
    hasInterested: false,
    proposedBy: 'Emirates Chapter',
    targetDateNotice: 'Needs 35 interested members to lock superyacht charter'
  },
  // 7. Owerri - Gathering Interest
  {
    id: 'event-7',
    title: 'The Heartland Executive Rooftop & Live Highlife Gala',
    subtitle: 'Modern Highlife Symphony, Palm Wine Bar & VIP Networking',
    category: 'Networking',
    date: 'Targeting January Holiday Season',
    time: '6:00 PM – 11:00 PM',
    location: 'Rooftop Sky Lounge, New Owerri',
    city: 'Owerri',
    image: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1000&q=80',
    price: '₦100,000 / Ticket',
    attendeesCount: 0,
    maxAttendees: 25,
    description: 'A stylish homecoming soiree celebrating returning diaspora and local founders in Imo State with live strings and five-star culinary creations.',
    isRsvped: false,
    status: 'gathering_interest',
    interestedCount: 0,
    minInterestedMembers: 25,
    interestedUserIds: [],
    hasInterested: false,
    proposedBy: 'Imo Club Chapter',
    targetDateNotice: 'Needs 25 interested members to lock venue & date'
  }
];

export const MOCK_CONVERSATIONS: ConversationThread[] = [];
