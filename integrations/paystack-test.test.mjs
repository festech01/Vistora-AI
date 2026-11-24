import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createPaystackAdapter, verifyWebhook } from './paystack.mjs';

const secret = 'sk_test_' + 'fixture';
const signing = 'whsec_' + 'fixture';
const order = {reference:'demo-123',currency:'NGN',amountMinor:100000,email:'tester@example.invalid'};
const transaction = {domain:'test',status:'success',reference:order.reference,currency:'NGN',amount:100000,id:42};
function adapter(data, inspect = () => {}) {
  return createPaystackAdapter({mode:'test',secret,webhookSecret:signing,fetchImpl:async(url, options)=>{
    inspect(url,options);
    return Response.json({status:true,data});
  }});
}
const body = Buffer.from(JSON.stringify({event:'charge.success',data:{reference:order.reference}}));
const now = Math.floor(Date.now()/1000);
function signature(bytes, t=now) {
  return 't=' + t + ',v1=whk_fixture:' + createHmac('sha512',signing).update(t+'.').update(bytes).digest('hex');
}

test('initializes hosted checkout using server order in minor units',async()=>{
  const result = await adapter({reference:order.reference,authorization_url:'https://checkout.paystack.com/test'},(url,options)=>{
    assert.equal(url,'https://api.paystack.co/transaction/initialize');
    assert.deepEqual(JSON.parse(options.body),{amount:100000,currency:'NGN',email:order.email,reference:order.reference});
  }).initialize(order);
  assert.equal(result.reference,order.reference);
});
test('rejects unapproved checkout origin',async()=>{
  await assert.rejects(adapter({reference:order.reference,authorization_url:'https://example.invalid/checkout'}).initialize(order));
});
test('accepts only independently verified order match',async()=>{
  const confirmed = await adapter(transaction,(url,options)=>{
    assert.equal(url,'https://api.paystack.co/transaction/verify/demo-123');assert.equal(options.method,'GET');
  }).verify(order);
  assert.equal(confirmed.providerTransactionId,'42');
});
for(const [field, value] of Object.entries({domain:'live',status:'failed',amount:7,currency:'USD',reference:'other',id:null})) {
  test('rejects mismatched verification field '+field, async()=>{
    await assert.rejects(adapter({...transaction,[field]:value}).verify(order));
  });
}
test('rejects live keys in test mode',()=>assert.throws(()=>createPaystackAdapter({mode:'test',secret:'sk_live_'+'fixture',webhookSecret:signing})));
test('authenticates raw bytes and rotating signatures',()=>{
  const signed = signature(body)+',v1=whk_new:'+'0'.repeat(128);
  assert.deepEqual(adapter({}).readWebhook(body,signed),{reference:order.reference});
  assert.equal(verifyWebhook(Buffer.concat([body,Buffer.from(' ')]),signed,signing,now),false);
});
test('rejects stale, future, malformed or unsigned webhook',()=>{
  for(const header of [signature(body,now-301),signature(body,now+301),signature(body)+',t='+now,'t='+now+',v1=whk_old:abc',null]){
    assert.equal(verifyWebhook(body,header,signing,now),false);
  }
});

test('explicit live mode verifies only live transactions (injected transport)',async()=>{
  const adapter = createPaystackAdapter({mode:'live',secret:'sk_live_'+'fixture',webhookSecret:signing,
    fetchImpl:async()=>Response.json({status:true,data:{...transaction,domain:'live'}})});
  assert.equal((await adapter.verify(order)).reference,order.reference);
});
test('legacy mode uses the account secret only when configured; timestamped mode rejects legacy signatures',()=>{
  const hex = createHmac('sha512',secret).update(body).digest('hex');
  const legacy = createPaystackAdapter({mode:'test',secret,signatureMode:'legacy'});
  assert.equal(legacy.readWebhook(body,hex).reference,order.reference);
  assert.throws(()=>adapter({}).readWebhook(body,hex));
  assert.throws(()=>legacy.readWebhook(body,signature(body)));
});
