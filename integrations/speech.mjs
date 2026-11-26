const voices=['alloy','marin','cedar','coral','onyx']
const tones=['Natural','Warm','Calm','Lively']
export function speechInput(value){
 const text=typeof value?.text==='string'?value.text.trim():''
 if(!text||text.length>1800||!voices.includes(value.voice)||!tones.includes(value.tone)||![0.85,1,1.15].includes(value.speed)||!['mp3','wav'].includes(value.format))throw Error('Check the script and voice settings.')
 return {text,voice:value.voice,tone:value.tone,speed:value.speed,format:value.format}
}
export function speechCredits(text,rate){
 if(!Number.isSafeInteger(rate)||rate<1||rate>10000)throw Error('Voice pricing is unavailable.')
 return Math.ceil(text.length/500)*rate
}
export async function renderSpeech(input,key,transport=fetch){
 const s=speechInput(input)
 return transport('https://api.openai.com/v1/audio/speech',{method:'POST',redirect:'error',signal:AbortSignal.timeout(80000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',input:s.text,voice:s.voice,speed:s.speed,response_format:s.format,instructions:'Read in a '+s.tone.toLowerCase()+' tone. Preserve the words and their meaning.'})})
}
