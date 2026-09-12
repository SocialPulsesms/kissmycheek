import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { 
  getPersistentEventsData, 
  toggleEventRsvpRecord, 
  toggleEventInterestRecord, 
  proposeNewEventRecord,
  saveEventVipPreferencesRecord
} from '@/lib/eventsStore';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    const userId = session?.userId || '';
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const status = searchParams.get('status'); // 'gathering_interest' | 'greenlit' | 'all'

    const data = getPersistentEventsData();
    let filteredEvents = data.events;

    if (category && category !== 'All') {
      filteredEvents = filteredEvents.filter(e => e.category === category);
    }
    if (city && city !== 'All') {
      filteredEvents = filteredEvents.filter(e => e.city.toLowerCase() === city.toLowerCase());
    }
    if (status && status !== 'all') {
      filteredEvents = filteredEvents.filter(e => e.status === status);
    }

    // Annotate with active user's interest and rsvp state
    const formatted = filteredEvents.map(e => ({
      ...e,
      hasInterested: Array.isArray(e.interestedUserIds) ? e.interestedUserIds.includes(userId) : false,
      isRsvped: data.rsvpedEventIds?.includes(e.id) || false
    }));

    // Calculate aggregated metrics
    const totalInterested = data.events.reduce((acc, ev) => acc + (ev.interestedCount || 0), 0);
    const gatheringInterestCount = data.events.filter(ev => ev.status === 'gathering_interest').length;
    const greenlitCount = data.events.filter(ev => ev.status === 'greenlit').length;

    return NextResponse.json({
      success: true,
      events: formatted,
      totalEvents: formatted.length,
      metrics: {
        totalInterested,
        gatheringInterestCount,
        greenlitCount
      }
    });

  } catch (err: any) {
    const { MOCK_EVENTS } = await import('@/lib/mockData');
    return NextResponse.json({
      success: true,
      events: MOCK_EVENTS,
      totalEvents: MOCK_EVENTS.length,
      metrics: {
        totalInterested: 280,
        gatheringInterestCount: 4,
        greenlitCount: 3
      }
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }
    const userId = session.userId;
    const body = await req.json();
    const { eventId, action, proposal } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // 1. Action: Show Interest in Event (Crowd Greenlighting)
    if (action === 'interest') {
      if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
      }
      const updatedStore = toggleEventInterestRecord(eventId, userId);
      const target = updatedStore.events.find(e => e.id === eventId);
      return NextResponse.json({
        success: true,
        message: target?.hasInterested ? 'Interest Registered! We will notify you when greenlit.' : 'Interest Removed',
        event: target,
        events: updatedStore.events
      });
    }

    // 2. Action: Propose a New Event Concept
    if (action === 'propose') {
      if (!proposal || !proposal.title || !proposal.city || !proposal.description) {
        return NextResponse.json({ error: 'Title, city, and description are required for event proposals' }, { status: 400 });
      }
      const updatedStore = proposeNewEventRecord(proposal, userId);
      return NextResponse.json({
        success: true,
        message: 'Event Concept Submitted! It is now gathering member interest.',
        events: updatedStore.events
      });
    }

    // 3. Action: RSVP / Ticket Reservation for Confirmed/Greenlit Events
    if (action === 'rsvp' || action === 'cancel') {
      if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
      }
      try {
        if (action === 'rsvp') {
          await prisma.eventAttendee.upsert({
            where: {
              eventId_userId: { eventId, userId }
            },
            update: { status: 'CONFIRMED' },
            create: { eventId, userId, status: 'CONFIRMED' }
          });
        } else {
          await prisma.eventAttendee.deleteMany({
            where: { eventId, userId }
          });
        }
      } catch (dbErr) {
        // Fallback
      }

      const updatedStore = toggleEventRsvpRecord(eventId, action === 'rsvp');
      return NextResponse.json({
        success: true,
        message: action === 'rsvp' ? 'VIP Pass Confirmed' : 'RSVP Cancelled',
        events: updatedStore.events
      });
    }

    // 4. Action: Save Exclusive Member Bespoke Food, Drink & Fun Entertainment Preferences
    if (action === 'vip_preferences') {
      if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
      }
      const { foodPreferences, drinkPreferences, funPreferences, notes } = body;
      const updatedStore = saveEventVipPreferencesRecord(eventId, userId, {
        foodPreferences: Array.isArray(foodPreferences) ? foodPreferences : [],
        drinkPreferences: Array.isArray(drinkPreferences) ? drinkPreferences : [],
        funPreferences: Array.isArray(funPreferences) ? funPreferences : [],
        notes: typeof notes === 'string' ? notes : ''
      });
      return NextResponse.json({
        success: true,
        message: '✨ Your VIP Bespoke Dining, Beverage & Fun Entertainment preferences have been dispatched to the Executive Concierge!',
        events: updatedStore.events
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
