'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, CheckoutResult, SubscriptionStatus } from '@/lib/api';
import { Pill } from '@/components/ui';

export default function PlusPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const { ok, data } = await api<SubscriptionStatus>('/me/subscription');
    if (ok) setStatus(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  async function checkout(): Promise<void> {
    setBusy(true);
    setError('');
    setReceipt(null);
    const { ok, data } = await api<CheckoutResult & { failure_reason?: string }>('/subscription/checkout', {
      method: 'POST',
      body: { plan, card_number: cardNumber, cvv, expiry_date: expiry },
    });
    setBusy(false);
    if (!ok) {
      setError(data.failure_reason ? `Vulnbank declined: ${data.failure_reason}` : data.error || 'Checkout failed.');
      return;
    }
    setReceipt(data);
    await load();
  }

  const active = status?.active;

  return (
    <>
      <div className="page-head">
        <h1>Zero Health Plus</h1>
        <p>Video consults, family accounts, and medical history import.</p>
      </div>

      {status && (
        <div className="panel">
          <h2>
            Subscription
            {active ? <Pill status="active" label={status.plan || 'active'} /> : <Pill status="cancelled" label="Free plan" />}
          </h2>
          {active ? (
            <p className="empty" style={{ marginBottom: 0 }}>
              Plus is active until {status.until}
            </p>
          ) : (
            <p className="empty" style={{ marginBottom: 0 }}>
              You are on the free plan. Upgrade to unlock Plus features.
            </p>
          )}
        </div>
      )}

      <div className="plan-grid">
        <button
          type="button"
          className={`plan-card ${plan === 'monthly' ? 'plan-selected' : ''}`}
          onClick={() => setPlan('monthly')}
        >
          <div className="plan-name">Monthly</div>
          <div className="plan-price">
            $5<span>/month</span>
          </div>
          <div className="s">All Plus features, billed monthly</div>
        </button>
        <button
          type="button"
          className={`plan-card ${plan === 'annual' ? 'plan-selected' : ''}`}
          onClick={() => setPlan('annual')}
        >
          <div className="plan-name">Annual</div>
          <div className="plan-price">
            $50<span>/year</span>
          </div>
          <div className="s">Two months free, billed yearly</div>
        </button>
      </div>

      <div className="panel">
        <h2>Pay with your Vulnbank card</h2>
        <div className="inline-form" style={{ marginBottom: 16 }}>
          <div style={{ flex: 2 }}>
            <label htmlFor="card_number">Card number</label>
            <input
              id="card_number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="4111111111111111"
              inputMode="numeric"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="card_cvv">CVV</label>
            <input
              id="card_cvv"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
              placeholder="123"
              inputMode="numeric"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="card_exp">Expiry</label>
            <input id="card_exp" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="12/28" />
          </div>
        </div>
        {status && !status.vulnbank_configured && (
          <p className="empty" style={{ marginBottom: 12 }}>
            The payment provider is not configured on the API (Vulnbank). Checkout will not go through.
          </p>
        )}
        <button
          className="btn btn-primary"
          onClick={checkout}
          disabled={busy || !cardNumber || !cvv || !expiry}
        >
          {busy ? 'Charging card…' : `Subscribe — $${plan === 'annual' ? '50/year' : '5/month'}`}
        </button>
        <div className="err">{error}</div>
      </div>

      {receipt && (
        <div className="panel">
          <h2>
            Payment complete
            <Pill status="active" label={receipt.payment.status} />
          </h2>
          <div className="booking-summary">
            <b>{receipt.plan} subscription</b>
            <br />
            Paid ${receipt.payment.amount} with your Vulnbank card
            <br />
            Authorization code: <span className="code-chip">{receipt.payment.authorization_code}</span>
            <br />
            Active until {receipt.until}
          </div>
        </div>
      )}
    </>
  );
}
