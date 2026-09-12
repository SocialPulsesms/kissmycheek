// Kiss My Cheek VIP Concierge & AI Support Store
// Handles AI Club Assistant Intelligence & Human Staff Helpdesk Tickets

export type SupportCategory = 
  | 'MEMBERSHIP' 
  | 'VERIFICATION' 
  | 'CREDITS_BILLING' 
  | 'DATING_SAFETY' 
  | 'TECHNICAL' 
  | 'NAUGHTY_ZONE' 
  | 'GENERAL';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_MEMBER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'URGENT_VIP' | 'HIGH' | 'NORMAL' | 'LOW';

export interface SupportMessage {
  id: string;
  sender: 'USER' | 'AI_CONCIERGE' | 'ADMIN_SUPPORT';
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isStaffReply?: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userTier: 'STANDARD' | 'PREMIUM' | 'ELITE' | 'FOUNDER';
  userAvatar: string;
  category: SupportCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  assignedAdmin?: string;
  internalStaffNotes?: string;
}

// Global In-Memory Store
let supportTickets: SupportTicket[] = [];

// Helper knowledge-base engine for the AI Concierge
export function generateAIConciergeAnswer(userPrompt: string): {
  answer: string;
  category: SupportCategory;
  suggestedActions: { label: string; href?: string; action?: string }[];
} {
  const query = userPrompt.toLowerCase().trim();

  // 1. Phone Privacy & Security
  if (query.includes('phone') || query.includes('number') || query.includes('private') || query.includes('confidential')) {
    return {
      category: 'DATING_SAFETY',
      answer: `🛡️ **Your Phone Number is Strictly Confidential & 100% Private**\n\nAt Kiss My Cheek, your phone number is encrypted and **never** displayed on your public profile, Discover deck, Member Directory, or Naughty Zone.\n\n• Only you can view or edit your private phone number inside **Settings > Account**.\n• Other members can only interact with you through encrypted in-app dispatches and high-definition WebRTC video dates.\n• Your contact info is strictly protected by our VIP High-Society Privacy Protocols.`,
      suggestedActions: [
        { label: 'View Account Settings', href: '/settings' },
        { label: 'Review Privacy Policy', href: '/settings' }
      ]
    };
  }

  // 2. Membership Tiers & Elite Circle
  if (query.includes('elite') || query.includes('membership') || query.includes('tier') || query.includes('subscribe') || query.includes('price') || query.includes('cost') || query.includes('19500')) {
    return {
      category: 'MEMBERSHIP',
      answer: `👑 **Kiss My Cheek Elite Circle Privileges (₦19,500 / Month)**\n\nUpgrading to the **Elite Circle** unlocks the pinnacle of luxury dating:\n\n• **Unlimited Private Dispatches**: Chat freely without the standard 5-message limit.\n• **4K Ultra-HD Video Dates**: Real-time encrypted video calling directly inside the platform.\n• **Unblur Admirers**: See everyone who liked your profile instantly in the *Matches* room.\n• **Incognito & Ghost Browsing**: Explore member directories without leaving footprint logs.\n• **Golden Crown Crest**: Verified high-status badge on your profile.\n• **10 Complimentary Super Likes & Boost** granted monthly.`,
      suggestedActions: [
        { label: 'Upgrade to Elite Circle', href: '/membership' },
        { label: 'Activate Profile Boost', href: '/boost' }
      ]
    };
  }

  // 3. Biometric Selfie Verification & Verification Crest
  if (query.includes('verify') || query.includes('verification') || query.includes('selfie') || query.includes('biometric') || query.includes('badge') || query.includes('shield')) {
    return {
      category: 'VERIFICATION',
      answer: `🛡️ **Identity & Biometric Facial Verification Protocol**\n\nKiss My Cheek enforces strict 100% real-person vetting to eliminate catfishing and bots:\n\n1. **Selfie Capture**: Take a real-time live selfie or upload an authentic photo.\n2. **AI Facial Mesh Analysis**: Our biometric system compares your selfie against your uploaded portfolio photos (requiring a >95% similarity score).\n3. **Human Governance Review**: Our admin team cross-checks verification queues 24/7.\n\nOnce cleared, your profile immediately displays the **Golden Verified Shield Check** across all feeds.`,
      suggestedActions: [
        { label: 'Go to Biometric Scanner', href: '/settings' },
        { label: 'Update Portfolio Photos', href: '/settings' }
      ]
    };
  }

  // 4. Credits, Diamonds, Dom Pérignon & Gifting
  if (query.includes('credit') || query.includes('diamond') || query.includes('gift') || query.includes('champagne') || query.includes('bottle') || query.includes('sticker') || query.includes('coin')) {
    return {
      category: 'CREDITS_BILLING',
      answer: `💎 **Private Date Credits & Creator Diamonds**\n\nCredits represent our club's exclusive luxury currency:\n\n• **Luxury Dispatches & Bespoke Gifts**: Send animated VIP stickers (Dom Pérignon, Solitaire Diamonds, Supercar Keys, Black Centurion Cards) to your date.\n• **Naughty Zone Tipping**: Tip your favorite creators to help them climb the podium.\n• **Creator Diamonds Vault**: When you receive gifts or tips, Diamonds accumulate in your Creator Vault, which you can withdraw to your Nigerian or international bank account.\n\n*Credits can be topped up seamlessly using Flutterwave (Debit Cards, Bank Transfer, USSD, Apple Pay).*`,
      suggestedActions: [
        { label: 'Top Up Credits', href: '/membership' },
        { label: 'Explore Naughty Zone', href: '/naughty-zone' }
      ]
    };
  }

  // 5. Naughty Zone & ₦5,000,000 Prize Pool
  if (query.includes('naughty') || query.includes('prize') || query.includes('5000000') || query.includes('podium') || query.includes('post') || query.includes('champion') || query.includes('photo')) {
    return {
      category: 'NAUGHTY_ZONE',
      answer: `🔥 **The Naughty Zone & ₦5,000,000 Prize Pool**\n\nThe Naughty Zone is our exclusive social glamour runway:\n\n• **Upload Media**: Share sensual, high-fashion, and luxury lifestyle photos & video reels.\n• **Double-Tap Flame Hearts**: Patrons can double-tap your photos to boost your ranking.\n• **Top 3 Podium of Champions**:\n  - 👑 **#1 Gold Crown**: ₦2,500,000 + 5,000 Diamonds\n  - 🥈 **#2 Silver Crown**: ₦1,500,000 + 3,000 Diamonds\n  - 🥉 **#3 Bronze Crown**: ₦1,000,000 + 2,000 Diamonds\n• Competitions settle weekly on Sunday midnight with instant direct vault payouts.`,
      suggestedActions: [
        { label: 'Visit Naughty Zone', href: '/naughty-zone' },
        { label: 'Publish New Glamour Post', href: '/naughty-zone' }
      ]
    };
  }

  // 6. Flutterwave Payments & Billing Troubleshooting
  if (query.includes('payment') || query.includes('flutterwave') || query.includes('card') || query.includes('bank') || query.includes('charge') || query.includes('refund') || query.includes('receipt') || query.includes('debit')) {
    return {
      category: 'CREDITS_BILLING',
      answer: `💳 **Discreet Billing & Flutterwave Gateway Support**\n\nAll club transactions are processed securely via Flutterwave:\n\n• **Accepted Methods**: Nigerian Naira Mastercard / Visa / Verve, Bank Wire Transfers, USSD quick codes, and International Cards (USD/GBP/EUR).\n• **Discreet Billing Descriptor**: Transactions appear as discreet lifestyle entries (*KMC Club Int'l*) for total privacy.\n• **Instant Vault Crediting**: If you experienced a delayed transaction, please provide your **Flutterwave Transaction Reference (FLW-...)** by opening a support ticket below for instant 2-minute manual clearance.`,
      suggestedActions: [
        { label: 'Open Billing Support Ticket', action: 'CREATE_TICKET' },
        { label: 'View Membership Plans', href: '/membership' }
      ]
    };
  }

  // 7. Travel Mode, Changing City & Location
  if (query.includes('location') || query.includes('city') || query.includes('travel') || query.includes('state') || query.includes('enugu') || query.includes('lagos') || query.includes('abuja') || query.includes('london')) {
    return {
      category: 'GENERAL',
      answer: `✈️ **Global Travel Mode & City Location Filters**\n\nKiss My Cheek is active across all 36 Nigerian States (Enugu, Lagos, Abuja, Port Harcourt, Kano, etc.) and top international luxury capitals (London, Paris, Dubai, New York, Monaco):\n\n• You can filter your **Discover Deck** and **Member Directory** by any specific city or geopolitical zone.\n• To update your home residence, navigate to **Settings > Account** and adjust your primary location.`,
      suggestedActions: [
        { label: 'Browse Member Directory', href: '/directory' },
        { label: 'Update Account Location', href: '/settings' }
      ]
    };
  }

  // 8. 4K Video & Voice Calls WebRTC
  if (query.includes('call') || query.includes('video') || query.includes('audio') || query.includes('camera') || query.includes('microphone') || query.includes('webrtc')) {
    return {
      category: 'TECHNICAL',
      answer: `📞 **Encrypted 4K Video Dates & Voice Signaling**\n\n• Calls are encrypted end-to-end utilizing secure peer-to-peer WebRTC signaling.\n• Both members must be verified club patrons to initiate dates.\n• Ensure you allow Camera and Microphone permissions in your browser or mobile device.\n• Call history and logs are archived confidentially in your Messages panel.`,
      suggestedActions: [
        { label: 'Open Messages & Calls', href: '/messages' },
        { label: 'Test Camera Permissions', href: '/settings' }
      ]
    };
  }

  // Default General AI response
  return {
    category: 'GENERAL',
    answer: `✨ **Welcome to Kiss My Cheek VIP Concierge**\n\nI am your 24/7 AI Club Concierge, engineered to assist you with any aspect of the platform:\n\n• **VIP Membership & Elite Circle Upgrades** (₦19,500/mo)\n• **Identity & Biometric Selfie Verification**\n• **Private Date Credits, Bespoke Gifts & Diamonds**\n• **Naughty Zone ₦5,000,000 Championship Entries**\n• **Flutterwave Billing, Payments & Receipts**\n• **Privacy, Confidentiality & Discreet Ghost Mode**\n\nIf your request requires personalized staff assistance, click **"Contact Human Support"** to dispatch an urgent ticket to our Executive Governance Team.`,
    suggestedActions: [
      { label: 'Contact Human Support', action: 'CREATE_TICKET' },
      { label: 'Membership Benefits', href: '/membership' },
      { label: 'Biometrics Clearance', href: '/settings' }
    ]
  };
}

// Support Ticket Management functions
export function getAllSupportTickets(): SupportTicket[] {
  return supportTickets;
}

export function getMemberSupportTickets(userId: string, userEmail?: string): SupportTicket[] {
  return supportTickets.filter(t => t.userId === userId || (userEmail && t.userEmail.toLowerCase() === userEmail.toLowerCase()));
}

export function createSupportTicket(data: {
  userId: string;
  userName: string;
  userEmail: string;
  userTier?: 'STANDARD' | 'PREMIUM' | 'ELITE' | 'FOUNDER';
  userAvatar?: string;
  category: SupportCategory;
  priority?: TicketPriority;
  subject: string;
  initialMessage: string;
}): SupportTicket {
  const newTicket: SupportTicket = {
    id: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
    userId: data.userId,
    userName: data.userName || 'Club Member',
    userEmail: data.userEmail || 'member@kissmycheek.com',
    userTier: data.userTier || 'STANDARD',
    userAvatar: data.userAvatar || '',
    category: data.category,
    priority: data.priority || (data.userTier === 'ELITE' ? 'URGENT_VIP' : 'NORMAL'),
    status: 'OPEN',
    subject: data.subject,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `msg-${Date.now()}-user`,
        sender: 'USER',
        senderName: data.userName || 'Club Member',
        senderAvatar: data.userAvatar,
        content: data.initialMessage,
        timestamp: 'Just now'
      },
      {
        id: `msg-${Date.now()}-ai`,
        sender: 'AI_CONCIERGE',
        senderName: 'KMC AI Concierge',
        senderAvatar: '/crown-gold.png',
        content: `Greetings ${data.userName}. Your inquiry has been registered with ID \`${data.subject}\`. Our AI Concierge and Human Executive Desk have queued this case. An official response will be delivered here momentarily.`,
        timestamp: 'Just now'
      }
    ]
  };

  supportTickets = [newTicket, ...supportTickets];
  return newTicket;
}

export function addMessageToSupportTicket(ticketId: string, message: {
  sender: 'USER' | 'ADMIN_SUPPORT';
  senderName: string;
  senderAvatar?: string;
  content: string;
}): SupportTicket | null {
  const ticket = supportTickets.find(t => t.id === ticketId);
  if (!ticket) return null;

  const newMsg: SupportMessage = {
    id: `msg-${Date.now()}`,
    sender: message.sender,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    content: message.content,
    timestamp: 'Just now',
    isStaffReply: message.sender === 'ADMIN_SUPPORT'
  };

  ticket.messages.push(newMsg);
  ticket.updatedAt = new Date().toISOString();
  if (message.sender === 'ADMIN_SUPPORT') {
    ticket.status = 'WAITING_MEMBER';
  } else {
    ticket.status = 'OPEN';
  }

  return ticket;
}

export function updateSupportTicketStatus(ticketId: string, status: TicketStatus, notes?: string): SupportTicket | null {
  const ticket = supportTickets.find(t => t.id === ticketId);
  if (!ticket) return null;

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  if (notes) ticket.internalStaffNotes = notes;

  return ticket;
}

export function updateSupportTicketPriority(ticketId: string, priority: TicketPriority): SupportTicket | null {
  const ticket = supportTickets.find(t => t.id === ticketId);
  if (!ticket) return null;

  ticket.priority = priority;
  ticket.updatedAt = new Date().toISOString();
  return ticket;
}
