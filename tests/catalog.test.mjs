import test from 'node:test'
import assert from 'node:assert/strict'
import {packageAmount,membership,priceLabel} from '../src/core/catalog.mjs'
test('server packages use integer kobo',()=>{assert.equal(packageAmount(500),500000);assert.throws(()=>packageAmount(1))})
test('eligible credits determine membership',()=>assert.deepEqual([0,499,500,1499,1500,2999,3000].map(membership),[0,0,1,1,2,2,3]))
test('missing FX rate cannot change checkout',()=>{assert.equal(priceLabel(100,'USD',{}),'FX rate pending');assert.equal(priceLabel(100,'NGN',{}),'₦1,000')})
