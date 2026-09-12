import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getPersistentMatches, recordMatchAction } from '@/lib/matchesStore';
import { getAllStoredUsers } from '@/lib/usersStore';
import { calculateAge } from '@/lib/dateUtils';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }
    const userId = session.userId;

    try {
      // 1. Fetch people who liked the current user (but not matched yet)
      const rawLikedYou = await prisma.like.findMany({
        where: {
          receiverId: userId,
          isPassed: false,
          senderId: {
            notIn: (await prisma.match.findMany({
              where: {
                OR: [{ user1Id: userId }, { user2Id: userId }]
              },
              select: { user1Id: true, user2Id: true }
            })).flatMap(m => [m.user1Id, m.user2Id]).filter(id => id !== userId)
          }
        },
        include: {
          sender: {
            include: { profile: { include: { photos: true, interests: true } } }
          }
        }
      });

      // 2. Fetch mutual matches
      const rawMutual = await prisma.match.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }]
        },
        include: {
          user1: { include: { profile: { include: { photos: true, interests: true } } } },
          user2: { include: { profile: { include: { photos: true, interests: true } } } }
        }
      });

      // 3. Fetch profiles the current user liked
      const rawYouLiked = await prisma.like.findMany({
        where: { senderId: userId, isPassed: false },
        include: {
          receiver: {
            include: { profile: { include: { photos: true, interests: true } } }
          }
        }
      });

      const storedUsers = getAllStoredUsers();

      const formatDbProfile = (userRecord: any) => {
        if (!userRecord || !userRecord.profile) return null;
        const p = userRecord.profile;
        const storedMatch = storedUsers.find(u => 
          u.id === userRecord.id || 
          (userRecord.email && u.email.toLowerCase() === userRecord.email.toLowerCase()) ||
          (p.fullName && u.profile?.fullName?.toLowerCase() === p.fullName.toLowerCase()) ||
          (p.customName && u.profile?.customName?.toLowerCase() === p.customName.toLowerCase())
        );

        const storedPhotos = (storedMatch?.profile?.photos || []).filter((url: string) => url && url !== '/crown-gold.png');
        const dbPhotos = (p.photos && p.photos.length > 0 ? p.photos.map((ph: any) => ph.url) : []).filter((url: string) => url && url !== '/crown-gold.png');
        const finalPhotos = dbPhotos.length > 0 ? dbPhotos : storedPhotos;

        return {
          id: userRecord.id,
          name: p.customName || p.fullName,
          age: calculateAge(p.dob) || 28,
          location: p.location || 'Nigeria',
          occupation: p.occupation || 'Executive Member',
          education: p.education || 'University Graduate',
          bio: p.bio || '',
          height: p.height || "5'9\"",
          verified: p.verifiedBadge || storedMatch?.isVerified || false,
          tier: userRecord.membershipTier || storedMatch?.membershipTier || 'ESSENTIAL',
          compatibility: p.compatibilityScore || 90,
          relationshipGoals: p.relationshipGoals || 'Serious Relationship',
          photos: finalPhotos,
          interests: p.interests && p.interests.length > 0 ? p.interests.map((i: any) => i.name) : (storedMatch?.profile?.interests || ['Fine Dining']),
          online: true,
          distance: 'Within Victoria Island'
        };
      };

      const likedYou = rawLikedYou.map(l => formatDbProfile(l.sender)).filter(Boolean);
      const mutual = rawMutual.map(m => {
        const partner = m.user1Id === userId ? m.user2 : m.user1;
        return formatDbProfile(partner);
      }).filter(Boolean);
      const youLiked = rawYouLiked.map(l => formatDbProfile(l.receiver)).filter(Boolean);

      if (likedYou.length > 0 || mutual.length > 0 || youLiked.length > 0) {
        return NextResponse.json({
          success: true,
          likes: {
            likedYou,
            mutual,
            youLiked,
            expiring: likedYou.slice(0, 1)
          },
          counts: {
            likedYou: likedYou.length,
            mutual: mutual.length,
            youLiked: youLiked.length,
            expiring: Math.min(1, likedYou.length)
          }
        });
      }
    } catch (dbErr) {
      // Fall through to persistent matches store
    }

    // Persistent Local & Disk Store
    const store = getPersistentMatches();

    const sanitizeProfile = (p: any) => {
      if (!p) return p;
      const photos = (p.photos || []).filter((u: string) => u && u !== '/crown-gold.png');
      return {
        ...p,
        photos
      };
    };

    return NextResponse.json({
      success: true,
      likes: {
        likedYou: store.likedYou.map(sanitizeProfile),
        mutual: store.mutual.map(sanitizeProfile),
        youLiked: store.youLiked.map(sanitizeProfile),
        expiring: store.expiring.map(sanitizeProfile)
      },
      counts: {
        likedYou: store.likedYou.length,
        mutual: store.mutual.length,
        youLiked: store.youLiked.length,
        expiring: store.expiring.length
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to query matches' }, { status: 500 });
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
    const { targetUserId, action } = body; // action: 'like' | 'pass' | 'superlike'

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Target user ID and swipe action are required' }, { status: 400 });
    }

    const isLike = action === 'like' || action === 'superlike';
    const isPassed = action === 'pass';

    // 1. Try DB persistence first if available
    try {
      const swipe = await prisma.like.upsert({
        where: {
          senderId_receiverId: {
            senderId: userId,
            receiverId: targetUserId
          }
        },
        update: {
          isSuperLike: action === 'superlike',
          isPassed
        },
        create: {
          senderId: userId,
          receiverId: targetUserId,
          isSuperLike: action === 'superlike',
          isPassed
        }
      });

      if (isLike) {
        const reverseLike = await prisma.like.findUnique({
          where: {
            senderId_receiverId: {
              senderId: targetUserId,
              receiverId: userId
            }
          }
        });

        if (reverseLike && !reverseLike.isPassed) {
          const newMatch = await prisma.match.create({
            data: {
              user1Id: userId < targetUserId ? userId : targetUserId,
              user2Id: userId < targetUserId ? targetUserId : userId
            }
          });

          return NextResponse.json({
            success: true,
            action,
            isMatch: true,
            matchDetails: {
              matchId: newMatch.id,
              matchedAt: newMatch.createdAt,
              celebrationPrompt: "It's a Mutual Connection ✨"
            }
          });
        }
      }
    } catch (dbErr) {
      // Use persistent disk store
    }

    // 2. Persistent disk store fallback
    const result = recordMatchAction(targetUserId, action);

    return NextResponse.json({
      success: true,
      action,
      isMatch: result.isMatch,
      matchDetails: result.matchDetails
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process swipe' }, { status: 500 });
  }
}
