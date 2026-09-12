import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { 
  CURRENCIES, 
  CREDIT_PACKS, 
  ELITE_MONTHLY_PRICE_GBP, 
  SupportedCurrency 
} from '@/lib/creditsStore';
import { initializeFlutterwavePayment } from '@/lib/flutterwave';

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to complete payments' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      type, 
      currency = 'NGN', 
      planTier, 
      packId, 
      eventId, 
      customerEmail,
      customerName,
      customerPhone,
      baseGBPPrice,
      title: customTitle,
      description: customDescription,
      payment_options
    } = body;

    const selectedCurrency = (currency as SupportedCurrency) || 'NGN';
    const currConfig = CURRENCIES[selectedCurrency] || CURRENCIES.NGN;

    let amount = 0;
    let title = customTitle || 'Kiss My Cheek';
    let description = customDescription || 'Exclusive Club Transaction';
    let itemMeta: Record<string, any> = { userId, type, currency: selectedCurrency };

    // 1. Membership Plan
    if (type === 'MEMBERSHIP') {
      const isAnnual = planTier === 'ANNUAL';
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0
        ? baseGBPPrice
        : (isAnnual ? ELITE_MONTHLY_PRICE_GBP * 10 : ELITE_MONTHLY_PRICE_GBP);
      amount = Math.round(baseGBP * currConfig.rateAgainstGBP);
      title = customTitle || 'Kiss My Cheek — Elite Tier';
      description = customDescription || (isAnnual 
        ? 'Elite Black Card Membership (12-Month Annual Pass)' 
        : 'Elite Black Card Membership (Monthly Subscription)');
      itemMeta.planTier = planTier || 'MONTHLY';
    } 
    // 2. Credits / Diamonds Pack Top-Up
    else if (type === 'CREDITS') {
      const pack = CREDIT_PACKS.find(p => p.id === packId) || CREDIT_PACKS[0];
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0
        ? baseGBPPrice
        : pack.baseGBPPrice;
      amount = Math.round(baseGBP * currConfig.rateAgainstGBP);
      title = customTitle || 'Kiss My Cheek — Club Credits';
      description = customDescription || `${pack.title} (${pack.credits + pack.bonusCredits} Credits)`;
      itemMeta.packId = pack.id;
      itemMeta.credits = pack.credits + pack.bonusCredits;
    } 
    // 3. Exclusive Event Ticket
    else if (type === 'EVENT_TICKET') {
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0
        ? baseGBPPrice
        : 50;
      amount = Math.round(baseGBP * currConfig.rateAgainstGBP);
      title = customTitle || 'Kiss My Cheek — VIP Event Ticket';
      description = customDescription || 'Confidential Private Gala & Soirée Pass';
      itemMeta.eventId = eventId || 'event-1';
    } 
    // 4. Profile Spotlight Boost
    else if (type === 'BOOST') {
      const duration = Number(body.boostDuration) || 30;
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0
        ? baseGBPPrice
        : (duration >= 1440 ? 45 : duration >= 60 ? 22 : 12);
      amount = Math.round(baseGBP * currConfig.rateAgainstGBP);
      title = customTitle || 'Kiss My Cheek — Profile Boost';
      description = customDescription || (duration >= 1440 ? '24-Hour Super Boost (50x Priority)' : duration >= 60 ? '1-Hour Prime Boost (25x Priority)' : '30-Minute Sprint Boost (10x Priority)');
      itemMeta.boostDuration = duration;
    } else {
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0
        ? baseGBPPrice
        : 10;
      amount = Math.round(baseGBP * currConfig.rateAgainstGBP);
    }

    const cleanType = type || 'CHECKOUT';
    const tx_ref = `KMC-${cleanType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Construct absolute redirect URL to verification endpoint
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirect_url = `${origin}/api/flutterwave/verify`;

    const customer = {
      email: customerEmail || session?.email || 'member@kissmycheek.club',
      name: customerName || session?.name || 'Verified Club Patron',
      phonenumber: customerPhone || '+2348000000000'
    };

    const paymentResponse = await initializeFlutterwavePayment({
      tx_ref,
      amount,
      currency: selectedCurrency,
      redirect_url,
      customer,
      customizations: {
        title: 'KISSMYCHEEK',
        description: description || 'Exclusive VIP Membership & Club Access',
        ...(origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')
          ? { logo: `${origin}/app-icon.png` }
          : {})
      },
      payment_options: payment_options || undefined,
      meta: itemMeta
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: paymentResponse.checkoutUrl,
      tx_ref,
      amount,
      currency: selectedCurrency
    });

  } catch (err: any) {
    console.error('Flutterwave initialize error:', err);
    return NextResponse.json(
      { error: err.message || 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
