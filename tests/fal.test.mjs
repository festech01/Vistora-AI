import test from 'node:test'
import assert from 'node:assert/strict'
import {createVideoProvider} from '../integrations/fal.mjs'
test('only configured endpoint and supported settings reach provider',async()=>{let count=0;const p=createVideoProvider('test',async(url,init)=>{count++;assert.equal(url,'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/text-to-video');assert.equal(JSON.parse(init.body).duration,'5');return Response.json({request_id:'valid-id'})});await assert.rejects(p.submit({prompt:'idea',duration:'60',ratio:'1:1'}));assert.equal(await p.submit({prompt:'idea',duration:'5',ratio:'1:1'}),'valid-id');assert.equal(count,1)})
import {directPrompt} from '../integrations/gemini.mjs'
test('director rejects incomplete structured output',async()=>{await assert.rejects(directPrompt({key:'test',model:'gemini-test',concept:'Lagoon',ratio:'16:9',duration:'5'},async()=>Response.json({candidates:[{content:{parts:[{text:'{}'}]}}]})),/Invalid creative brief/)})
