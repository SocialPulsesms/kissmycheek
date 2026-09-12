import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { 
  getAllSupportTickets, 
  getMemberSupportTickets, 
  createSupportTicket, 
  addMessageToSupportTicket, 
  updateSupportTicketStatus, 
  generateAIConciergeAnswer,
  SupportCategory,
  TicketPriority,
  TicketStatus
} from '@/lib/supportStore';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = getSessionUser(req);
    const all = searchParams.get('all') === 'true';
    const userId = searchParams.get('userId') || session?.id || 'user-me';
    const email = searchParams.get('email') || session?.email || '';

    // If requested by admin or all=true, return full ticket registry
    if (all || session?.role === 'ADMIN') {
      const tickets = getAllSupportTickets();
      return NextResponse.json({ success: true, tickets });
    }

    // Otherwise return member's personal tickets
    const tickets = getMemberSupportTickets(userId, email);
    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch support tickets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    const body = await req.json();
    const { action } = body;

    // 1. Instant AI Concierge Query
    if (action === 'ai_query') {
      const { prompt } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
      }

      const aiResponse = generateAIConciergeAnswer(prompt);
      return NextResponse.json({
        success: true,
        answer: aiResponse.answer,
        category: aiResponse.category,
        suggestedActions: aiResponse.suggestedActions
      });
    }

    // 2. Create New Support Ticket
    if (action === 'create_ticket') {
      const { 
        userId = session?.id || 'user-me',
        userName = session?.name || 'Club Member',
        userEmail = session?.email || 'member@kissmycheek.com',
        userTier = (session as any)?.membershipTier || 'STANDARD',
        userAvatar,
        category = 'GENERAL',
        priority,
        subject,
        message
      } = body;

      if (!subject || !message) {
        return NextResponse.json({ error: 'Subject and message are required to create a ticket' }, { status: 400 });
      }

      const newTicket = createSupportTicket({
        userId,
        userName,
        userEmail,
        userTier,
        userAvatar,
        category: category as SupportCategory,
        priority: priority as TicketPriority,
        subject,
        initialMessage: message
      });

      return NextResponse.json({ success: true, ticket: newTicket });
    }

    // 3. Add Reply to Ticket (Member or Staff)
    if (action === 'reply_ticket') {
      const { ticketId, message, sender = 'USER', senderName = 'Club Member', senderAvatar } = body;
      if (!ticketId || !message) {
        return NextResponse.json({ error: 'Ticket ID and message content are required' }, { status: 400 });
      }

      const updatedTicket = addMessageToSupportTicket(ticketId, {
        sender: sender as 'USER' | 'ADMIN_SUPPORT',
        senderName,
        senderAvatar,
        content: message
      });

      if (!updatedTicket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, ticket: updatedTicket });
    }

    // 4. Update Ticket Status (Admin)
    if (action === 'update_status') {
      const { ticketId, status, notes } = body;
      if (!ticketId || !status) {
        return NextResponse.json({ error: 'Ticket ID and status are required' }, { status: 400 });
      }

      const updatedTicket = updateSupportTicketStatus(ticketId, status as TicketStatus, notes);
      if (!updatedTicket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, ticket: updatedTicket });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error processing support request' }, { status: 500 });
  }
}
