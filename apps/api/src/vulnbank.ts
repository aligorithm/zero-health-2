/*
 * Vulnbank merchant payments: Zero Health Plus subscriptions are charged to
 * Vulnbank virtual cards through the Vulnbank Merchant Payment API.
 *
 * Register a merchant once on your Vulnbank instance (or via
 * POST /api/v1/merchants/register) and configure:
 *
 *   VULNBANK_URL               e.g. http://localhost:5000 (or your instance)
 *   VULNBANK_MERCHANT_API_KEY  the merchant API key from registration
 *
 * Without these, checkout answers 503 instead of charging.
 */

const VULNBANK_URL = (process.env.VULNBANK_URL || '').replace(/\/$/, '');
const VULNBANK_MERCHANT_API_KEY = process.env.VULNBANK_MERCHANT_API_KEY || '';

export function vulnbankConfigured(): boolean {
  return Boolean(VULNBANK_URL && VULNBANK_MERCHANT_API_KEY);
}

export interface ChargeInput {
  amount: number;
  plan: string;
  cardNumber: string;
  cvv: string;
  expiryDate: string;
  orderId: string;
}

export interface ChargeResult {
  approved: boolean;
  authorizationCode?: string;
  paymentId?: number;
  failureReason?: string;
  error?: string;
}

export async function chargeCard({
  amount,
  plan,
  cardNumber,
  cvv,
  expiryDate,
  orderId,
}: ChargeInput): Promise<ChargeResult> {
  const res = await fetch(`${VULNBANK_URL}/api/v1/payments/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Api-Key': VULNBANK_MERCHANT_API_KEY,
    },
    body: JSON.stringify({
      amount,
      currency: 'USD',
      card_number: cardNumber,
      cvv,
      expiry_date: expiryDate,
      merchant_order_id: orderId,
      description: `Zero Health Plus subscription (${plan})`,
    }),
    signal: AbortSignal.timeout(15000),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok && data?.status === 'success') {
    return {
      approved: true,
      authorizationCode: data?.payment?.authorization_code,
      paymentId: data?.payment?.id,
    };
  }

  return {
    approved: false,
    failureReason: data?.failure_reason || 'declined',
    error: data?.message || `Vulnbank returned HTTP ${res.status}`,
  };
}
