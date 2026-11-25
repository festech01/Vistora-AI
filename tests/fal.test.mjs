import test from 'node:test'
import assert from 'node:assert/strict'
import {createVideoProvider} from '../integrations/fal.mjs'
test('only configured endpoint and supported settings reach provider',async()=>{let count=0;const p=createVideoProvider('test',async(url,init)=>{count++;assert.equal(url,'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/text-to-video');assert.equal(JSON.parse(init.body).duration,'5');return Response.json({request_id:'valid-id'})});await assert.rejects(p.submit({prompt:'idea',duration:'60',ratio:'1:1'}));assert.equal(await p.submit({prompt:'idea',duration:'5',ratio:'1:1'}),'valid-id');assert.equal(count,1)})
import {directPrompt} from '../integrations/gemini.mjs'
test('director rejects incomplete structured output',async()=>{await assert.rejects(directPrompt({key:'test',model:'gemini-test',concept:'Lagoon',ratio:'16:9',duration:'5'},async()=>Response.json({candidates:[{content:{parts:[{text:'{}'}]}}]})),/Invalid creative brief/)})
test('missing acknowledgement cannot become a request ID',async()=>{
 const provider=createVideoProvider('key',async()=>Response.json({}))
 await assert.rejects(provider.submit({prompt:'idea',duration:'5',ratio:'16:9'}),/acknowledgment/)
 await assert.rejects(provider.status(undefined),/Invalid request ID/)
})
test('billing rejection returns actionable text without echoing private details',async()=>{
 const provider=createVideoProvider('key',async()=>new Response('User is locked. Reason: Exhausted balance. private detail',{status:403}))
 await assert.rejects(provider.submit({prompt:'idea',duration:'5',ratio:'16:9'}),{message:'fal reported a billing problem. Check the balance in the fal account.'})
})
test('review uses a read only history lookup and omits unrelated jobs',async()=>{
 const time=Date.now()-5000
 const provider=createVideoProvider('key',async(url,options)=>{
 assert.equal(new URL(url).hostname,'api.fal.ai')
 assert.equal(options.method??'GET','GET')
 return Response.json({items:[{request_id:'nearby',sent_at:new Date(time).toISOString(),status_code:200},{request_id:'older',sent_at:new Date(time-300000).toISOString()}]})
 })
 assert.deepEqual(await provider.history(time),[{id:'nearby',status:200}])
})
