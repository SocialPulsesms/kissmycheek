// Central Persistent Events & RSVP History Store
// Kiss My Cheek — Exclusive Dating & Social Club

import { ExclusiveEvent, MOCK_EVENTS } from './mockData';

export interface EventsStoreData {
  events: ExclusiveEvent[];
  rsvpedEventIds: string[];
}

function getEventsPersistencePath(): string | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'persistent_events_history.json');
  } catch {
    return null;
  }
}

const DEFAULT_EVENTS_DATA: EventsStoreData = {
  events: MOCK_EVENTS,
  rsvpedEventIds: []
};

export function getPersistentEventsData(): EventsStoreData {
  const filePath = getEventsPersistencePath();
  if (!filePath) return DEFAULT_EVENTS_DATA;

  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.events)) {
        // Hydrate events and keep genuine real user counts
        const hydratedEvents = parsed.events.map((e: any) => {
          const baseEvent = MOCK_EVENTS.find(m => m.id === e.id);
          const minQuorum = e.minInterestedMembers || baseEvent?.minInterestedMembers || 35;
          const status = e.status || 'gathering_interest';
          return {
            ...e,
            image: baseEvent?.image || e.image, // Ensure updated verified image URLs
            status,
            interestedCount: typeof e.interestedCount === 'number' ? e.interestedCount : 0,
            minInterestedMembers: minQuorum,
            interestedUserIds: Array.isArray(e.interestedUserIds) ? e.interestedUserIds : [],
            targetDateNotice: e.targetDateNotice || (status === 'greenlit' ? 'Quorum Reached • Confirmed for Hosting' : `Needs ${Math.max(1, minQuorum - (e.interestedCount || 0))} more interested members to host`)
          };
        });
        parsed.events = hydratedEvents;
        parsed.rsvpedEventIds = Array.isArray(parsed.rsvpedEventIds) ? parsed.rsvpedEventIds.filter((id: string) => id !== 'ev-1') : [];
        return parsed;
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_EVENTS_DATA, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Events history read error:', err);
  }
  return DEFAULT_EVENTS_DATA;
}

export function savePersistentEventsData(data: EventsStoreData): void {
  const filePath = getEventsPersistencePath();
  if (!filePath) return;
  try {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Events history write error:', err);
  }
}

export function toggleEventRsvpRecord(eventId: string, isRsvped: boolean): EventsStoreData {
  const data = getPersistentEventsData();
  
  if (isRsvped) {
    if (!data.rsvpedEventIds.includes(eventId)) {
      data.rsvpedEventIds.push(eventId);
    }
  } else {
    data.rsvpedEventIds = data.rsvpedEventIds.filter(id => id !== eventId);
  }

  data.events = data.events.map(ev => {
    if (ev.id === eventId) {
      return {
        ...ev,
        isRsvped,
        attendeesCount: isRsvped ? ev.attendeesCount + 1 : Math.max(0, ev.attendeesCount - 1)
      };
    }
    return ev;
  });

  savePersistentEventsData(data);
  return data;
}

/**
 * Toggle a member's interest in a proposed event.
 * Automatically checks quorum; if interestedCount >= minInterestedMembers,
 * the event dynamically switches from 'gathering_interest' to 'greenlit'!
 */
export function toggleEventInterestRecord(eventId: string, userId: string): EventsStoreData {
  const data = getPersistentEventsData();

  data.events = data.events.map(ev => {
    if (ev.id === eventId) {
      const userList = ev.interestedUserIds || [];
      const alreadyInterested = userList.includes(userId);
      const updatedList = alreadyInterested
        ? userList.filter(id => id !== userId)
        : [...userList, userId];
      
      const newInterestedCount = alreadyInterested
        ? Math.max(0, ev.interestedCount - 1)
        : ev.interestedCount + 1;

      // Check if threshold is reached
      let newStatus = ev.status;
      let targetNotice = ev.targetDateNotice;
      if (newInterestedCount >= ev.minInterestedMembers && ev.status === 'gathering_interest') {
        newStatus = 'greenlit';
        targetNotice = 'Quorum Reached • Event Confirmed for Hosting!';
      } else if (newInterestedCount < ev.minInterestedMembers && ev.status === 'gathering_interest') {
        const remaining = ev.minInterestedMembers - newInterestedCount;
        targetNotice = `Needs ${remaining} more interested members to host`;
      }

      return {
        ...ev,
        interestedCount: newInterestedCount,
        interestedUserIds: updatedList,
        hasInterested: !alreadyInterested,
        status: newStatus,
        targetDateNotice: targetNotice
      };
    }
    return ev;
  });

  savePersistentEventsData(data);
  return data;
}

/**
 * Submit a new member-proposed event concept for interest gathering.
 */
export function proposeNewEventRecord(proposal: {
  title: string;
  subtitle?: string;
  category: 'Gala' | 'VIP Party' | 'Retreat' | 'Dining' | 'Networking';
  city: string;
  location?: string;
  price?: string;
  description: string;
  minInterestedMembers?: number;
  image?: string;
  proposedBy?: string;
}, userId: string): EventsStoreData {
  const data = getPersistentEventsData();

  const minQuorum = proposal.minInterestedMembers || 35;
  const newEvent: ExclusiveEvent = {
    id: `event-prop-${Date.now()}`,
    title: proposal.title,
    subtitle: proposal.subtitle || `Member Proposed Gathering in ${proposal.city}`,
    category: proposal.category,
    date: 'Targeting Next Month',
    time: '7:00 PM – Midnight',
    location: proposal.location || `Curated Venue, ${proposal.city}`,
    city: proposal.city,
    image: proposal.image || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80',
    price: proposal.price || '₦100,000 / Ticket',
    attendeesCount: 0,
    maxAttendees: minQuorum + 10,
    description: proposal.description,
    isRsvped: false,
    status: 'gathering_interest',
    interestedCount: 1,
    minInterestedMembers: minQuorum,
    interestedUserIds: [userId],
    hasInterested: true,
    proposedBy: proposal.proposedBy || 'Club Member',
    targetDateNotice: `Needs ${minQuorum - 1} more interested members to host`
  };

  data.events.unshift(newEvent);
  savePersistentEventsData(data);
  return data;
}

/**
 * Save custom dining, beverage, and fun entertainment requests from exclusive VIP members
 */
export function saveEventVipPreferencesRecord(
  eventId: string,
  userId: string,
  preferences: {
    foodPreferences: string[];
    drinkPreferences: string[];
    funPreferences: string[];
    notes?: string;
  }
): EventsStoreData {
  const data = getPersistentEventsData();

  data.events = data.events.map(ev => {
    if (ev.id === eventId) {
      const existing = ev.vipPreferences || [];
      const updatedList = existing.filter(p => p.userId !== userId);
      updatedList.push({
        userId,
        foodPreferences: preferences.foodPreferences,
        drinkPreferences: preferences.drinkPreferences,
        funPreferences: preferences.funPreferences,
        notes: preferences.notes,
        submittedAt: new Date().toISOString()
      });
      return {
        ...ev,
        vipPreferences: updatedList
      };
    }
    return ev;
  });

  savePersistentEventsData(data);
  return data;
}
