// Node server module. Never import from a client component.
import { createHmac, timingSafeEqual } from 'node:crypto';

const validReference = value => typeof value === 'string' && /^[a-zA-Z0-9.=-]{1,128}$/.test(value);

function checkOrder(order) {
  if (!order || !validReference(order.reference) || order.currency !== 'NGN' ||
      !Number.isSafeInteger(order.amountMinor) || order.amountMinor <= 0) {
    throw new Error('Invalid server payment order');
  }
}

function requireModeKey(mode, key) {
  if (!['test', 'live'].includes(mode) || typeof key !== 'string' ||
      !key.startsWith('sk_' + mode + '_') || !/^sk_(test|live)_[A-Za-z0-9]+$/.test(key)) {
    throw new Error('Paystack key does not match the configured payment mode');
  }
}

export function verifyWebhook(rawBody, header, signingSecret, now = Math.floor(Date.now() / 1000)) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length > 131072 || typeof header !== 'string' || header.length > 8192 ||
      typeof signingSecret !== 'string' || !signingSecret.startsWith('whsec_') || signingSecret.length <= 6) return false;
  const fields = header.split(',').map(field => field.trim());
  const timestamps = fields.filter(field => field.startsWith('t='));
  if (timestamps.length !== 1 || !/^t=\d{10}$/.test(timestamps[0])) return false;
  const timestamp = timestamps[0].slice(2);
  if (Math.abs(now - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha512', signingSecret).update(timestamp + '.').update(rawBody).digest();
  return fields.some(field => {
    const match = /^v1=whk_[A-Za-z0-9_-]+:([0-9a-f]{128})$/.exec(field);
    return match !== null && timingSafeEqual(expected, Buffer.from(match[1], 'hex'));
  });
}

export function createPaystackAdapter({mode, secret, webhookSecret, signatureMode = 'timestamped', fetchImpl = fetch}) {
  requireModeKey(mode, secret);
  if (!['timestamped', 'legacy'].includes(signatureMode)) throw new Error('Unknown Paystack signature mode');
  if (signatureMode === 'timestamped' && (typeof webhookSecret !== 'string' || !webhookSecret.startsWith('whsec_') || webhookSecret.length <= 6)) {
    throw new Error('Configure the endpoint signing secret for the selected mode');
  }
  async function request(path, body) {
    const response = await fetchImpl('https://api.paystack.co' + path, {
      method: body ? 'POST' : 'GET',
      headers: {Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json'},
      body: body && JSON.stringify(body), redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('Paystack request unsuccessful');
    const result = await response.json();
    if (result?.status !== true || !result.data) throw new Error('Paystack rejected request');
    return result.data;
  }
  return {
    async initialize(order) {
      checkOrder(order);
      if (typeof order.email !== 'string' || !order.email.includes('@')) throw new Error('Verified account email required');
      const data = await request('/transaction/initialize', {
        reference: order.reference, amount: order.amountMinor, currency: order.currency, email: order.email
      });
      const checkout = new URL(data.authorization_url);
      if (checkout.origin !== 'https://checkout.paystack.com' || checkout.username || checkout.password ||
          data.reference !== order.reference) throw new Error('Invalid checkout response');
      return {reference: order.reference, checkoutUrl: checkout.href};
    },
    async verify(order) {
      checkOrder(order);
      const data = await request('/transaction/verify/' + encodeURIComponent(order.reference));
      if (data.status !== 'success' || data.domain !== mode || data.reference !== order.reference ||
          data.currency !== order.currency || data.amount !== order.amountMinor ||
          !Number.isSafeInteger(data.id) || data.id <= 0) throw new Error('Transaction did not match the order');
      return {reference: order.reference, amountMinor: data.amount, currency: data.currency, providerTransactionId: String(data.id)};
    },
    readWebhook(rawBody, signature) {
      if (!Buffer.isBuffer(rawBody) || rawBody.length > 131072) throw new Error('Invalid webhook body');
      let authentic;
      if (signatureMode === 'timestamped') {
        authentic = verifyWebhook(rawBody, signature, webhookSecret);
      } else {
        authentic = typeof signature === 'string' && /^[a-f0-9]{128}$/.test(signature) &&
          timingSafeEqual(createHmac('sha512', secret).update(rawBody).digest(), Buffer.from(signature, 'hex'));
      }
      if (!authentic) throw new Error('Unauthenticated webhook');
      const event = JSON.parse(rawBody.toString('utf8'));
      if (event?.event !== 'charge.success') return null;
      if (!validReference(event.data?.reference)) throw new Error('Invalid transaction reference');
      return {reference: event.data.reference};
    }
  };
}
