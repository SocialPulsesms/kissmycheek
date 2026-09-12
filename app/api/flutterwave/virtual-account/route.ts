import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { 
  CURRENCIES, 
  CREDIT_PACKS, 
  ELITE_MONTHLY_PRICE_GBP 
} from '@/lib/creditsStore';
import { createDynamicVirtualAccount } from '@/lib/flutterwave';

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    const userId = session?.userId;

    const body = await req.json();
    const { 
      type = 'MEMBERSHIP', 
      planTier = 'MONTHLY', 
      packId, 
      eventId, 
      boostDuration,
      baseGBPPrice,
      customerEmail,
      customerName,
      customerPhone,
      title: customTitle,
      description: customDescription
    } = body;

    const ngnConfig = CURRENCIES.NGN;

    // Calculate exact NGN price
    let amount = 0;
    let description = customDescription || 'Exclusive Club Transaction';

    if (type === 'MEMBERSHIP') {
      const isAnnual = planTier === 'ANNUAL';
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0
        ? baseGBPPrice
        : (isAnnual ? ELITE_MONTHLY_PRICE_GBP * 10 : ELITE_MONTHLY_PRICE_GBP);
      amount = Math.round(baseGBP * ngnConfig.rateAgainstGBP);
      description = isAnnual ? 'Elite Black Card Annual' : 'Elite Black Card Monthly';
    } else if (type === 'CREDITS') {
      const pack = CREDIT_PACKS.find(p => p.id === packId) || CREDIT_PACKS[0];
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0
        ? baseGBPPrice
        : pack.baseGBPPrice;
      amount = Math.round(baseGBP * ngnConfig.rateAgainstGBP);
      description = `${pack.title} Credits`;
    } else if (type === 'EVENT_TICKET') {
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0 ? baseGBPPrice : 50;
      amount = Math.round(baseGBP * ngnConfig.rateAgainstGBP);
      description = customTitle || 'VIP Event Pass';
    } else if (type === 'BOOST') {
      const duration = Number(boostDuration) || 30;
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0
        ? baseGBPPrice
        : (duration >= 1440 ? 45 : duration >= 60 ? 22 : 12);
      amount = Math.round(baseGBP * ngnConfig.rateAgainstGBP);
      description = `Profile Boost (${duration}m)`;
    } else {
      const baseGBP = typeof baseGBPPrice === 'number' && baseGBPPrice > 0 ? baseGBPPrice : 10;
      amount = Math.round(baseGBP * ngnConfig.rateAgainstGBP);
    }

    const cleanType = (type || 'VIP').replace(/[^a-zA-Z0-9]/g, '');
    const userTag = userId ? userId.slice(-4) : Math.random().toString(36).substring(2, 6);
    const tx_ref = `KMC-VA-${cleanType}-${userTag}-${Date.now()}`;

    // Customer email formatting
    const patronEmail = customerEmail || session?.email || `patron.${userTag}@kissmycheek.club`;
    const patronName = customerName || session?.name || 'Verified Patron';
    const nameParts = patronName.trim().split(' ');
    const firstname = nameParts[0] || 'Patron';
    const lastname = nameParts.slice(1).join(' ') || 'VIP';

    const accountResult = await createDynamicVirtualAccount({
      email: patronEmail,
      amount,
      tx_ref,
      phonenumber: customerPhone || '08000000000',
      firstname,
      lastname,
      narration: `Kiss My Cheek ${description}`.slice(0, 50),
      is_permanent: false
    });

    if (!accountResult.success || !accountResult.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: accountResult.message || 'Unable to generate dynamic virtual account' 
        },
        { status: 502 }
      );
    }

    const data = accountResult.data;

    return NextResponse.json({
      success: true,
      virtualAccount: {
        bankName: data.bank_name,
        accountNumber: data.account_number,
        accountName: data.note || 'KISSMYCHEEK VIP',
        amount: Number(data.amount) || amount,
        formattedAmount: `₦${(Number(data.amount) || amount).toLocaleString()}`,
        expiryDate: data.expiry_date,
        orderRef: data.order_ref,
        flwRef: data.flw_ref,
        tx_ref
      }
    });

  } catch (err: any) {
    console.error('Virtual account generation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error generating virtual account' },
      { status: 500 }
    );
  }
}
