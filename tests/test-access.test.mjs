import test from 'node:test'
import assert from 'node:assert/strict'
import {sign,verify,equal} from '../src/core/test-access.mjs'
const key='private test secret '.repeat(3),end=Date.now()+60000
test('signed invitations have a role and expiration',()=>{const code=sign('invite','test',end,key);assert.deepEqual(verify(code,key),{role:'invite',id:'test',expiry:end});assert.equal(verify(code+'x',key),null);assert.equal(verify(code,key+'other'),null)})
test('expired and malformed tokens cannot authenticate',()=>{assert.equal(verify(sign('owner','test',Date.now()-1,key),key),null);assert.equal(verify('invalid',key),null);assert.equal(equal(undefined,undefined),false)})
