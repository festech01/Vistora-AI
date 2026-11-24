// Explicit, operator-authorized paid commissioning only. Resume with the request ID.
import {createVideoProvider} from '../integrations/fal.mjs'
const provider=createVideoProvider(process.env.FAL_KEY)
const args=process.argv.slice(2)
if(args[0]==='--submit-approved-paid-check'&&args.length===1){console.log('Provider request ID:',await provider.submit({prompt:'A slow tracking shot along a quiet lagoon at sunset, stable exposure and gentle ripples.',duration:'5',ratio:'16:9'}))}
else if(args[0]==='--status'&&args.length===2){const response=await provider.status(args[1]);console.log(response.status);if(response.status==='COMPLETED'){const result=await provider.result(args[1]);console.log('Video reference returned:',Boolean(result.video?.url))}}
else throw Error('Choose an explicit submit or status operation')
