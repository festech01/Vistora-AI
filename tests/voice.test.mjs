import test from 'node:test'
import assert from 'node:assert/strict'
import {speechInput,speechCredits,renderSpeech} from '../integrations/speech.mjs'
import {createVideoProvider} from '../integrations/fal.mjs'
const options={text:'Hello',voice:'marin',tone:'Warm',speed:1,format:'wav'}
test('valid speech input is normalized',()=>assert.deepEqual(speechInput({...options,text:' Hello '}),options))
test('invalid input is rejected before spending',()=>{for(const change of [{text:''},{text:'a'.repeat(1801)},{speed:99},{format:'exe'},{voice:'unknown'}])assert.throws(()=>speechInput({...options,...change}))})
test('voice quote uses server rate and rounds in blocks',()=>{assert.equal(speechCredits('a'.repeat(501),3),6);assert.throws(()=>speechCredits('a',0))})
test('voice request includes the approved settings',async()=>{await renderSpeech(options,'test',async(url,init)=>{assert.equal(new URL(url).hostname,'api.openai.com');assert.equal(JSON.parse(init.body).response_format,'wav');assert.equal(JSON.parse(init.body).voice,'marin');return new Response('audio')})})
test('image video sends image payload to the image endpoint',async()=>{const p=createVideoProvider('test',async(url,init)=>{assert.ok(url.endsWith('image-to-video'));assert.equal(JSON.parse(init.body).aspect_ratio,undefined);return Response.json({request_id:'ok'})});await p.submit({prompt:'wave',ratio:'16:9',duration:'5',reference:'data:image/jpeg;base64,YQ=='})})
