// Next prerenders the signed out page. Check the exact HTML before publishing it.
import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const page=await readFile('.next/server/app/index.html','utf8')
assert.ok(page.includes('Example videos')&&page.includes('Where does a shadow go?'),'Example gallery missing')
assert.ok(page.includes('Create an account'),'Sign up link missing')
for(const privateValue of ['Choose your credits','My credits','₦1,000','₦30,000','My projects','Checkout currency is NGN']){
 assert.ok(!page.includes(privateValue),'Private dashboard text in visitor HTML: '+privateValue)
}
console.log('Visitor page check passed: examples are visible and account details are hidden.')
