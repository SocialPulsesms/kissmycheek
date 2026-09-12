import { NextRequest, NextResponse } from 'next/server';
import { 
  getNaughtyPosts, 
  toggleLikeNaughtyPost, 
  incrementPostDMs, 
  tipNaughtyPost, 
  createNaughtyPost,
  NAUGHTY_TAGS,
  PRIZE_POOL_NAIRA,
  PRIZE_POOL_DIAMONDS
} from '@/lib/naughtyZoneStore';
import { deductCredits } from '@/lib/creditsStore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = (searchParams.get('filter') || 'trending') as 'trending' | 'dms' | 'latest';
    const city = searchParams.get('city') || 'all';

    const posts = getNaughtyPosts(filter, city);
    const podium = posts.slice(0, 3);

    return NextResponse.json({
      success: true,
      posts,
      podium,
      tags: NAUGHTY_TAGS,
      prizePoolNaira: PRIZE_POOL_NAIRA,
      prizePoolDiamonds: PRIZE_POOL_DIAMONDS,
      totalCompetitors: posts.length,
    });
  } catch (error) {
    console.error('Error fetching naughty zone posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, postId, diamonds, image, caption, tags, city } = body;

    if (action === 'like') {
      if (!postId) {
        return NextResponse.json({ success: false, error: 'Missing postId' }, { status: 400 });
      }
      const result = toggleLikeNaughtyPost(postId);
      return NextResponse.json(result);
    }

    if (action === 'dm') {
      if (!postId) {
        return NextResponse.json({ success: false, error: 'Missing postId' }, { status: 400 });
      }
      const result = incrementPostDMs(postId);
      return NextResponse.json(result);
    }

    if (action === 'tip') {
      if (!postId || !diamonds || diamonds <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid tip amount' }, { status: 400 });
      }
      // Deduct from wallet
      const deducted = deductCredits(diamonds);
      if (!deducted) {
        return NextResponse.json(
          { success: false, error: 'Insufficient credits in wallet. Please top up.' },
          { status: 400 }
        );
      }
      const result = tipNaughtyPost(postId, diamonds);
      return NextResponse.json(result);
    }

    if (action === 'create') {
      if (!image || !caption) {
        return NextResponse.json({ success: false, error: 'Photo and caption are required' }, { status: 400 });
      }
      const result = createNaughtyPost({
        image,
        caption,
        tags: Array.isArray(tags) ? tags : [],
        city: city || 'Enugu'
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in naughty zone action:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
