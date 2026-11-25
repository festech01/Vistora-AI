// Commission one endpoint at a time. Settings are specific to this endpoint.
const endpoint='fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(id)
export class VideoProviderError extends Error {}
function providerMessage(status, body) {
 if (status === 402 || (status === 403 && /exhausted balance|insufficient (credits|balance)|out of credits/i.test(body))) return 'fal reported a billing problem. Check the balance in the fal account.'
 if (status === 401) return 'fal rejected the API key. Check FAL_KEY in the Vercel production settings.'
 if (status === 403) return 'fal denied access. Check the permissions and IP restrictions on the production key.'
 if (status === 429) return 'fal reported a request limit. Check the limits in the fal account.'
 if ([400,422].includes(status)) return 'fal rejected the video settings or content. Review the request in fal.'
 return 'fal returned HTTP ' + status + '. Check the request in fal.'
}
export function createVideoProvider(key,transport=fetch){
 if(!key?.trim())throw Error('Missing fal credential')
 const headers={Authorization:'Key '+key.trim(),'Content-Type':'application/json'}
 async function send(url,init={}){const response=await transport(url,{...init,headers,redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new VideoProviderError(providerMessage(response.status,await response.text()));return response.json()}
 return {async submit({prompt,duration,ratio,reference=undefined}){if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2500||!['5','10'].includes(duration)||!['16:9','9:16','1:1'].includes(ratio))throw Error('Unsupported video settings')
 if(reference!==undefined&&(typeof reference!=='string'||reference.length>400000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(reference)))throw Error('Unsupported reference')
 const path=reference?'fal-ai/kling-video/v2.5-turbo/pro/image-to-video':endpoint
 const settings=reference?{prompt,duration,image_url:reference}:{prompt,duration,aspect_ratio:ratio}
 const result=await send('https://queue.fal.run/'+path,{method:'POST',body:JSON.stringify(settings)});if(!validId(result?.request_id))throw Error('Invalid provider acknowledgment');return result.request_id},
 async history(time){
 const query=new URLSearchParams({endpoint_id:endpoint,start:new Date(time-60000).toISOString(),end:new Date(Math.min(Date.now(),time+3600000)).toISOString(),limit:'100'})
 const page=await send('https://api.fal.ai/v1/models/requests/by-endpoint?'+query)
 if(!Array.isArray(page.items))throw Error('Invalid history response')
 return page.items.filter(row=>validId(row.request_id)&&Math.abs(Date.parse(row.sent_at)-time)<60000).map(row=>({id:row.request_id,status:row.status_code}))
 },
 async status(id){if(!validId(id))throw Error('Invalid request ID');return send('https://queue.fal.run/fal-ai/kling-video/requests/'+id+'/status')},
 async result(id){if(!validId(id))throw Error('Invalid request ID');return send('https://queue.fal.run/fal-ai/kling-video/requests/'+id)}}
}
