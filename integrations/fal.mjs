// Commission one endpoint at a time. Settings are specific to this endpoint.
const endpoint='fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
export function createVideoProvider(key,transport=fetch){
 if(!key)throw Error('Missing fal credential')
 const headers={Authorization:'Key '+key,'Content-Type':'application/json'}
 async function send(url,init={}){const response=await transport(url,{...init,headers,redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Provider request failed: '+response.status);return response.json()}
 return {async submit({prompt,duration,ratio}){if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2500||!['5','10'].includes(duration)||!['16:9','9:16','1:1'].includes(ratio))throw Error('Unsupported video settings')
 const result=await send('https://queue.fal.run/'+endpoint,{method:'POST',body:JSON.stringify({prompt,duration,aspect_ratio:ratio})});if(!/^[a-zA-Z0-9-]{1,100}$/.test(result.request_id))throw Error('Invalid provider acknowledgment');return result.request_id},
 async status(id){if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw Error('Invalid request ID');return send('https://queue.fal.run/fal-ai/kling-video/requests/'+id+'/status')},
 async result(id){if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw Error('Invalid request ID');return send('https://queue.fal.run/fal-ai/kling-video/requests/'+id)}}
}
