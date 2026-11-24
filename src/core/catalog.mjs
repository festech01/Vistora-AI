export const packages = [100,500,1500,3000];
export const tiers = ['Starter','Creator','Professional','Elite'];
export const models = ['MiniMax H3 Max','Kling 2.5 Turbo Pro','Kling 3.0 Pro','Veo 3.1 Fast'];
export const currencies = ['NGN','USD','GBP','EUR','GHS','ZAR','KES','CAD','AUD','INR','AED'];
export const tools = ['Video Studio','Face Swap','Reverse Engineer','Prompt Studio'];
export function packageAmount(credits){if(!packages.includes(credits))throw Error('Unknown package');return credits*1000}
export function membership(eligible){return eligible>=3000?3:eligible>=1500?2:eligible>=500?1:0}
export function priceLabel(credits,currency,rates){if(currency==='NGN')return '₦'+(credits*10).toLocaleString('en-NG'); const rate=rates[currency]; return rate>0?'≈ '+new Intl.NumberFormat('en',{style:'currency',currency}).format(credits*10*rate):'FX rate pending'}
