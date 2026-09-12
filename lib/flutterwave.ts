// Central Flutterwave Payment Service for Kiss My Cheek
// Supports Local Payments (NGN: Bank Transfer, Verve/Cards, USSD) and International Payments (USD, GBP, EUR, Apple Pay)

export interface FlutterwaveCustomer {
  email: string;
  phonenumber?: string;
  name: string;
}

export interface FlutterwavePaymentRequest {
  tx_ref: string;
  amount: number;
  currency: string;
  redirect_url: string;
  customer: FlutterwaveCustomer;
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  meta?: Record<string, any>;
  payment_options?: string;
}

export interface FlutterwaveInitResponse {
  success: boolean;
  checkoutUrl: string;
  tx_ref: string;
  message?: string;
}

export interface FlutterwaveVerifiedTransaction {
  id: number | string;
  tx_ref: string;
  flw_ref?: string;
  amount: number;
  currency: string;
  status: 'successful' | 'failed' | 'pending';
  customer: FlutterwaveCustomer;
  meta?: Record<string, any>;
  charged_at?: string;
  payment_type?: string;
}

export const FLUTTERWAVE_CONFIG = {
  get publicKey() {
    return process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';
  },
  get secretKey() {
    return process.env.FLUTTERWAVE_SECRET_KEY || '';
  },
  get secretHash() {
    return process.env.FLUTTERWAVE_SECRET_HASH || 'kissmycheek_flw_secret_hash_2026';
  }
};

/**
 * Initialize a Flutterwave Standard hosted checkout link via live Flutterwave API.
 */
export async function initializeFlutterwavePayment(
  payload: FlutterwavePaymentRequest
): Promise<FlutterwaveInitResponse> {
  const secretKey = FLUTTERWAVE_CONFIG.secretKey;

  if (!secretKey) {
    return {
      success: false,
      checkoutUrl: '',
      tx_ref: payload.tx_ref,
      message: 'Flutterwave Secret Key is missing in environment variables.'
    };
  }

  try {
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`
      },
      body: JSON.stringify({
        tx_ref: payload.tx_ref,
        amount: payload.amount.toString(),
        currency: payload.currency.toUpperCase(),
        redirect_url: payload.redirect_url,
        customer: payload.customer,
        customizations: payload.customizations,
        meta: payload.meta || {},
        payment_options: payload.payment_options || 'card,banktransfer,ussd,applepay,googlepay'
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success' && data.data?.link) {
      return {
        success: true,
        checkoutUrl: data.data.link,
        tx_ref: payload.tx_ref,
        message: data.message
      };
    }

    return {
      success: false,
      checkoutUrl: '',
      tx_ref: payload.tx_ref,
      message: data?.message || 'Flutterwave payment initialization failed. Please check credentials.'
    };
  } catch (apiErr: any) {
    return {
      success: false,
      checkoutUrl: '',
      tx_ref: payload.tx_ref,
      message: apiErr?.message || 'Network error communicating with Flutterwave payment gateway.'
    };
  }
}

/**
 * Verify a completed transaction with live Flutterwave API.
 */
export async function verifyFlutterwaveTransaction(
  transactionId: string | number
): Promise<{ success: boolean; data?: FlutterwaveVerifiedTransaction; error?: string }> {
  const secretKey = FLUTTERWAVE_CONFIG.secretKey;

  if (!secretKey) {
    return { success: false, error: 'Flutterwave Secret Key missing' };
  }

  if (!transactionId) {
    return { success: false, error: 'Transaction ID is required for verification' };
  }

  try {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`
      }
    });

    const result = await response.json();

    if (response.ok && result.status === 'success' && result.data) {
      return {
        success: result.data.status === 'successful',
        data: {
          id: result.data.id,
          tx_ref: result.data.tx_ref,
          flw_ref: result.data.flw_ref,
          amount: Number(result.data.amount),
          currency: result.data.currency,
          status: result.data.status,
          customer: result.data.customer,
          meta: result.data.meta,
          charged_at: result.data.created_at,
          payment_type: result.data.payment_type
        }
      };
    }

    return {
      success: false,
      error: result?.message || 'Transaction could not be verified by Flutterwave'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Verification network error'
    };
  }
}

/**
 * Verify incoming webhook signature against configured secret hash.
 */
export function verifyFlutterwaveWebhookSignature(signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  return signatureHeader === FLUTTERWAVE_CONFIG.secretHash;
}

export interface FlutterwaveVirtualAccountRequest {
  email: string;
  is_permanent?: boolean;
  amount?: number;
  tx_ref: string;
  phonenumber?: string;
  firstname?: string;
  lastname?: string;
  narration?: string;
  bvn?: string;
}

export interface FlutterwaveVirtualAccountData {
  account_number: string;
  bank_name: string;
  flw_ref: string;
  order_ref: string;
  expiry_date: string;
  note?: string;
  amount?: string | number;
  response_code?: string;
  response_message?: string;
}

export interface FlutterwaveVirtualAccountResponse {
  success: boolean;
  data?: FlutterwaveVirtualAccountData;
  message?: string;
  tx_ref: string;
}

/**
 * Create a dynamic, temporary virtual account for instant NGN bank transfers.
 * Flutterwave generates a dedicated virtual account mapped to the tx_ref.
 */
export async function createDynamicVirtualAccount(
  payload: FlutterwaveVirtualAccountRequest
): Promise<FlutterwaveVirtualAccountResponse> {
  const secretKey = FLUTTERWAVE_CONFIG.secretKey;

  if (!secretKey) {
    return {
      success: false,
      tx_ref: payload.tx_ref,
      message: 'Flutterwave Secret Key is missing in environment variables.'
    };
  }

  try {
    const response = await fetch('https://api.flutterwave.com/v3/virtual-account-numbers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`
      },
      body: JSON.stringify({
        email: payload.email,
        is_permanent: payload.is_permanent ?? false,
        amount: payload.amount,
        tx_ref: payload.tx_ref,
        phonenumber: payload.phonenumber || '08000000000',
        firstname: payload.firstname || 'Club',
        lastname: payload.lastname || 'Patron',
        narration: payload.narration || 'Kiss My Cheek VIP Transfer',
        ...(payload.bvn ? { bvn: payload.bvn } : {})
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success' && data.data?.account_number) {
      return {
        success: true,
        data: {
          account_number: data.data.account_number,
          bank_name: data.data.bank_name || 'Wema Bank',
          flw_ref: data.data.flw_ref,
          order_ref: data.data.order_ref,
          expiry_date: data.data.expiry_date,
          note: data.data.note,
          amount: data.data.amount,
          response_code: data.data.response_code,
          response_message: data.data.response_message
        },
        tx_ref: payload.tx_ref,
        message: data.message
      };
    }

    return {
      success: false,
      tx_ref: payload.tx_ref,
      message: data?.message || 'Unable to generate dynamic virtual account from Flutterwave.'
    };
  } catch (apiErr: any) {
    return {
      success: false,
      tx_ref: payload.tx_ref,
      message: apiErr?.message || 'Network error communicating with Flutterwave Virtual Accounts API.'
    };
  }
}

/**
 * Verify payment status of a transaction directly by its unique merchant reference (tx_ref).
 * Ideal for dynamic virtual accounts and real-time polling.
 */
export async function verifyFlutterwaveByReference(
  txRef: string
): Promise<{ success: boolean; data?: FlutterwaveVerifiedTransaction; pending?: boolean; error?: string }> {
  const secretKey = FLUTTERWAVE_CONFIG.secretKey;

  if (!secretKey) {
    return { success: false, error: 'Flutterwave Secret Key missing' };
  }

  if (!txRef) {
    return { success: false, error: 'Transaction reference is required for verification' };
  }

  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretKey}`
        }
      }
    );

    const result = await response.json();

    if (response.ok && result.status === 'success' && result.data) {
      const isSuccessful = result.data.status === 'successful';
      return {
        success: isSuccessful,
        pending: result.data.status === 'pending',
        data: {
          id: result.data.id,
          tx_ref: result.data.tx_ref,
          flw_ref: result.data.flw_ref,
          amount: Number(result.data.amount),
          currency: result.data.currency,
          status: result.data.status,
          customer: result.data.customer,
          meta: result.data.meta,
          charged_at: result.data.created_at,
          payment_type: result.data.payment_type
        }
      };
    }

    // Unpaid or pending transaction
    return {
      success: false,
      pending: true,
      error: result?.message || 'Transaction pending or not yet found'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Verification network error'
    };
  }
}
