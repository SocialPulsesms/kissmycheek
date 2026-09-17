import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { 
  getConversationsForUser, 
  getConversationById, 
  postMessageToThread,
  toggleReactionOnMessage,
  createOrGetConversationThread,
  findThreadByParticipant,
  markThreadAsRead,
  getCanonicalThreadId
} from '@/lib/messageStore';
import { getAllStoredUsers } from '@/lib/usersStore';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');
    const activeThreadId = searchParams.get('activeThreadId');

    // Resolve canonical current user ID
    let currentUserId = session?.userId || 'user-me';
    const userAnyIds = new Set<string>();
    if (session?.userId) userAnyIds.add(session.userId);

    if (session?.email) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: session.email, mode: 'insensitive' } },
              ...(session.userId ? [{ id: session.userId }] : [])
            ]
          },
          select: { id: true }
        });
        if (dbUser?.id) {
          currentUserId = dbUser.id;
          userAnyIds.add(dbUser.id);
        }
      } catch {}
    }

    if (activeThreadId) {
      markThreadAsRead(activeThreadId, currentUserId);
    }

    // 1. Specific Thread Message Fetch
    if (threadId) {
      markThreadAsRead(threadId, currentUserId);

      const memoryThread = getConversationById(threadId, currentUserId);

      try {
        const messages = await prisma.message.findMany({
          where: { conversationId: threadId },
          orderBy: { createdAt: 'asc' }
        });

        if (messages && messages.length > 0) {
          const memMsgMap = new Map((memoryThread?.messages || []).map(m => [m.id, m]));
          return NextResponse.json({
            success: true,
            messages: messages.map(m => {
              const mem = memMsgMap.get(m.id);
              return {
                id: m.id,
                senderId: m.senderId,
                content: m.content,
                timestamp: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mediaUrl: m.mediaUrl || undefined,
                mediaType: mem?.mediaType || undefined,
                isVoiceNote: m.isVoiceNote,
                read: true,
                reactions: mem?.reactions || []
              };
            }),
            currentUserId
          });
        }
      } catch (err) {
        // Fallback to store
      }

      return NextResponse.json({
        success: true,
        messages: memoryThread?.messages || [],
        currentUserId
      });
    }

    // 2. Fetch all active conversations for the authenticated user
    try {
      if (session?.userId || userAnyIds.size > 0) {
        const idList = Array.from(userAnyIds);
        const dbConversations = await prisma.conversation.findMany({
          where: {
            OR: [
              { user1Id: { in: idList } },
              { user2Id: { in: idList } }
            ]
          },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { updatedAt: 'desc' }
        });

        if (dbConversations && dbConversations.length > 0) {
          const validConversations = dbConversations.filter(c => c.user1Id !== c.user2Id);
          const rawThreads = await Promise.all(
            validConversations.map(async (c) => {
              const partnerId = userAnyIds.has(c.user1Id) ? c.user2Id : c.user1Id;
              if (userAnyIds.has(partnerId)) return null;

              const partnerProfile = await prisma.profile.findUnique({
                where: { userId: partnerId },
                include: { photos: true, user: true }
              });

              const lastMsgRecord = c.messages[0];
              const lastMessage = lastMsgRecord ? lastMsgRecord.content : 'Connection established';
              const lastMessageTime = lastMsgRecord 
                ? lastMsgRecord.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              const isActive = activeThreadId && (c.id === activeThreadId || c.id.includes(activeThreadId));
              const unreadCount = isActive ? 0 : await prisma.message.count({
                where: {
                  conversationId: c.id,
                  senderId: partnerId,
                  readAt: null
                }
              });

              const messages = await prisma.message.findMany({
                where: { conversationId: c.id },
                orderBy: { createdAt: 'asc' }
              });

              const storedUsers = getAllStoredUsers();
              const storedPartner = storedUsers.find(u => 
                u.id === partnerId || 
                (partnerProfile?.user?.email && u.email.toLowerCase() === partnerProfile.user.email.toLowerCase())
              );

              let photos = (partnerProfile?.photos?.map(ph => ph.url) || [])
                .filter(u => u && u !== '/crown-gold.png');

              if (photos.length === 0 && storedPartner?.profile?.photos && storedPartner.profile.photos.length > 0) {
                photos = storedPartner.profile.photos.filter(u => u && u !== '/crown-gold.png');
              }

              const partnerName = partnerProfile?.customName || 
                partnerProfile?.fullName || 
                storedPartner?.profile?.customName || 
                storedPartner?.profile?.fullName || 
                partnerProfile?.user?.email?.split('@')[0] || 
                storedPartner?.email?.split('@')[0] || 
                'Club Member';

              const memoryConv = getConversationById(c.id, currentUserId);
              const memMsgMap = new Map((memoryConv?.messages || []).map(m => [m.id, m]));

              return {
                id: c.id,
                participant: {
                  id: partnerId,
                  name: partnerName,
                  age: 28,
                  location: partnerProfile?.location || storedPartner?.profile?.location || 'Verified Member',
                  occupation: partnerProfile?.occupation || storedPartner?.profile?.occupation || 'Member',
                  photos,
                  interests: [],
                  tier: partnerProfile?.user?.membershipTier || storedPartner?.membershipTier || 'STANDARD',
                  online: true
                },
                lastMessage,
                lastMessageTime,
                unreadCount,
                messages: messages.map(m => {
                  const mem = memMsgMap.get(m.id);
                  return {
                    id: m.id,
                    senderId: m.senderId,
                    content: m.content,
                    timestamp: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    mediaUrl: m.mediaUrl || undefined,
                    mediaType: mem?.mediaType || undefined,
                    isVoiceNote: m.isVoiceNote,
                    read: isActive ? true : m.readAt !== null,
                    reactions: mem?.reactions || []
                  };
                })
              };
            })
          );

          const threads = rawThreads.filter(Boolean) as any[];

          // Also merge memory/file stored conversations so user never loses active threads
          const memoryFallback = getConversationsForUser(currentUserId)
            .filter(t => !userAnyIds.has(t.participant?.id) && t.participant?.id !== currentUserId);
          
          const dbCanonicalIds = new Set(threads.map(t => t.id));
          const dbParticipantIds = new Set(threads.map(t => t.participant?.id));

          memoryFallback.forEach(mem => {
            if (!dbCanonicalIds.has(mem.id) && !dbParticipantIds.has(mem.participant?.id)) {
              threads.push(mem);
            }
          });

          return NextResponse.json({
            success: true,
            conversations: threads.map(t => {
              if (activeThreadId && (t.id === activeThreadId || t.id.includes(activeThreadId))) {
                return {
                  ...t,
                  unreadCount: 0,
                  messages: t.messages.map((m: any) => ({ ...m, read: true }))
                };
              }
              return t;
            }),
            totalUnread: threads.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0),
            currentUserId
          });
        }
      }
    } catch (err) {
      // Prisma offline, fallback to unified memory/file store
    }

    const fallbackThreads = getConversationsForUser(currentUserId)
      .filter(t => !userAnyIds.has(t.participant?.id) && t.participant?.id !== currentUserId);
    return NextResponse.json({
      success: true,
      conversations: fallbackThreads.map(t => {
        if (activeThreadId && (t.id === activeThreadId || t.id.includes(activeThreadId))) {
          return {
            ...t,
            unreadCount: 0,
            messages: t.messages.map(m => ({ ...m, read: true }))
          };
        }
        return t;
      }),
      totalUnread: fallbackThreads.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0),
      currentUserId
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    const body = await requestJson(req);
    let currentUserId = session?.userId || body.senderId || 'user-me';

    if (session?.email) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: session.email, mode: 'insensitive' } },
              ...(currentUserId ? [{ id: currentUserId }] : [])
            ]
          },
          select: { id: true }
        });
        if (dbUser?.id) {
          currentUserId = dbUser.id;
        }
      } catch {}
    }

    const { 
      action, 
      threadId, 
      recipientId,
      participantName,
      participantPhoto,
      participantLocation,
      participantOccupation,
      participantAge,
      senderName,
      senderPhoto,
      messageId, 
      emoji, 
      content, 
      mediaUrl, 
      isVoiceNote, 
      stickerCode, 
      mediaType
    } = body;

    // 0. Mark thread as read action
    if (action === 'mark_read') {
      if (threadId) {
        // 1. Update in-memory / file stored messages
        markThreadAsRead(threadId, currentUserId);

        // 2. Update Prisma database records
        try {
          // A. Direct conversationId match
          await prisma.message.updateMany({
            where: {
              conversationId: threadId,
              readAt: null
            },
            data: {
              readAt: new Date()
            }
          });

          // B. Also match by conversation associations or canonical thread IDs
          const dbConvs = await prisma.conversation.findMany({
            where: {
              OR: [
                { id: threadId },
                { user1Id: threadId },
                { user2Id: threadId },
                ...(threadId.includes('__') ? (() => {
                  const parts = threadId.replace(/^th_/, '').split('__');
                  return [
                    { user1Id: parts[0], user2Id: parts[1] },
                    { user1Id: parts[1], user2Id: parts[0] }
                  ];
                })() : [])
              ]
            },
            select: { id: true }
          });

          for (const conv of dbConvs) {
            await prisma.message.updateMany({
              where: {
                conversationId: conv.id,
                readAt: null
              },
              data: {
                readAt: new Date()
              }
            });
          }
        } catch (dbErr) {
          console.warn('Prisma mark_read error:', dbErr);
        }
      }
      return NextResponse.json({ success: true });
    }

    // 1. Thread Initialization Action (1-on-1 end-to-end conversation setup)
    if (action === 'start_or_get_thread') {
      const targetRecipientId = recipientId || (threadId ? threadId.replace(/^th[-_]/, '') : '');
      if (!targetRecipientId) {
        return NextResponse.json({ error: 'Recipient ID required' }, { status: 400 });
      }

      if (targetRecipientId === currentUserId || (session?.userId && targetRecipientId === session.userId)) {
        return NextResponse.json({ error: 'You cannot message yourself' }, { status: 400 });
      }

      // Lookup real participant profiles
      const allUsers = getAllStoredUsers();
      const recUser = allUsers.find(u => u.id === targetRecipientId || u.email === targetRecipientId);
      const senUser = allUsers.find(u => u.id === currentUserId || u.email === currentUserId);

      let dbRecProfile: any = null;
      try {
        dbRecProfile = await prisma.profile.findUnique({
          where: { userId: targetRecipientId },
          include: { user: true, photos: true }
        });
      } catch {}

      const cleanRecPhotos = (dbRecProfile?.photos?.map((ph: any) => ph.url) || recUser?.profile?.photos || (participantPhoto ? [participantPhoto] : []))
        .filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png');

      const recipientData = {
        id: targetRecipientId,
        name: dbRecProfile?.customName || dbRecProfile?.fullName || recUser?.profile?.fullName || recUser?.profile?.customName || participantName || 'Club Member',
        photos: cleanRecPhotos,
        location: dbRecProfile?.location || recUser?.profile?.location || participantLocation || 'Verified Member',
        occupation: dbRecProfile?.occupation || recUser?.profile?.occupation || participantOccupation || 'Member',
        age: participantAge || 28,
        tier: dbRecProfile?.user?.membershipTier || recUser?.membershipTier || 'STANDARD'
      };

      const senderData = {
        id: currentUserId,
        name: senUser?.profile?.fullName || senUser?.profile?.customName || session?.fullName || senderName || 'Club Member',
        photos: (senUser?.profile?.photos || (senderPhoto ? [senderPhoto] : [])).filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png'),
        tier: senUser?.membershipTier || session?.tier || 'STANDARD'
      };

      const thread = createOrGetConversationThread(
        currentUserId,
        targetRecipientId,
        recipientData,
        senderData
      );

      return NextResponse.json({
        success: true,
        thread,
        conversations: getConversationsForUser(currentUserId).filter(t => t.participant?.id !== currentUserId),
        currentUserId
      });
    }

    // 2. Emoji Reaction Action (Quick Message Reaction)
    if (action === 'react') {
      if (!threadId || !messageId || !emoji) {
        return NextResponse.json({ error: 'Thread ID, Message ID, and Emoji are required' }, { status: 400 });
      }

      const updatedThread = toggleReactionOnMessage(threadId, messageId, emoji, currentUserId);
      return NextResponse.json({
        success: true,
        updatedThread,
        conversations: getConversationsForUser(currentUserId).filter(t => t.participant?.id !== currentUserId),
        currentUserId
      });
    }

    // 3. Dispatch New Message / Sticker / Image
    let targetRecipientId = recipientId;
    if (!targetRecipientId && threadId) {
      if (threadId.includes('__')) {
        const parts = threadId.replace(/^th_/, '').split('__');
        targetRecipientId = parts.find((p: string) => p !== currentUserId) || parts[1];
      } else {
        targetRecipientId = threadId.replace(/^th[-_]/, '');
      }
    }

    if (!targetRecipientId) {
      return NextResponse.json({ error: 'Valid Recipient ID or Thread ID is required' }, { status: 400 });
    }

    if ((targetRecipientId === currentUserId || (session?.userId && targetRecipientId === session.userId))) {
      return NextResponse.json({ error: 'You cannot message yourself' }, { status: 400 });
    }

    if (!content && !mediaUrl && !stickerCode) {
      return NextResponse.json({ error: 'Message content, media, or sticker is required' }, { status: 400 });
    }

    // Lookup sender and recipient metadata
    const allUsers = getAllStoredUsers();
    const recUser = allUsers.find(u => u.id === targetRecipientId || u.email === targetRecipientId);
    const senUser = allUsers.find(u => u.id === currentUserId || u.email === currentUserId);

    let dbRecProfile: any = null;
    try {
      dbRecProfile = await prisma.profile.findUnique({
        where: { userId: targetRecipientId },
        include: { user: true, photos: true }
      });
    } catch {}

    const cleanRecPhotos = (dbRecProfile?.photos?.map((ph: any) => ph.url) || recUser?.profile?.photos || (participantPhoto ? [participantPhoto] : []))
      .filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png');

    const recipientData = {
      id: targetRecipientId,
      name: dbRecProfile?.customName || dbRecProfile?.fullName || recUser?.profile?.fullName || recUser?.profile?.customName || participantName || 'Club Member',
      photos: cleanRecPhotos,
      location: dbRecProfile?.location || recUser?.profile?.location || participantLocation || 'Verified Member',
      occupation: dbRecProfile?.occupation || recUser?.profile?.occupation || participantOccupation || 'Member',
      age: participantAge || 28
    };

    const senderData = {
      id: currentUserId,
      name: senUser?.profile?.fullName || senUser?.profile?.customName || session?.fullName || senderName || 'Club Member',
      photos: (senUser?.profile?.photos || (senderPhoto ? [senderPhoto] : [])).filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png')
    };

    const canonicalId = getCanonicalThreadId(currentUserId, targetRecipientId);

    // Save into PostgreSQL Prisma if available
    try {
      if (session?.userId && targetRecipientId) {
        let dbConv = await prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id: currentUserId, user2Id: targetRecipientId },
              { user1Id: targetRecipientId, user2Id: currentUserId }
            ]
          }
        });

        if (!dbConv) {
          dbConv = await prisma.conversation.create({
            data: {
              id: canonicalId,
              user1Id: currentUserId,
              user2Id: targetRecipientId
            }
          });
        }

        const resolvedContent = content || (stickerCode ? `Sticker ${stickerCode}` : mediaUrl ? 'Photo' : 'Voice note');

        await prisma.message.create({
          data: {
            conversationId: dbConv.id,
            senderId: currentUserId,
            content: resolvedContent,
            mediaUrl: mediaUrl || null,
            isVoiceNote: Boolean(isVoiceNote)
          }
        });
      }
    } catch (e) {
      // Prisma offline or schema fallback
    }

    // Save into genuine in-memory/JSON store
    const { userMessage, updatedThread } = postMessageToThread(
      canonicalId,
      content,
      isVoiceNote,
      mediaUrl,
      mediaType,
      stickerCode,
      recipientData,
      currentUserId,
      targetRecipientId,
      senderData
    );

    return NextResponse.json({
      success: true,
      message: 'Message dispatched securely',
      sentMessage: userMessage,
      updatedThread,
      conversations: getConversationsForUser(currentUserId),
      currentUserId
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process message action' }, { status: 500 });
  }
}

async function requestJson(req: Request) {
  try {
    return await req.json();
  } catch (err) {
    return {};
  }
}
