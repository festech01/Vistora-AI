// Verify the compiled visitor page regardless of the build host's output directory.
import {readFile,readdir} from 'node:fs/promises'
import {join} from 'node:path'
import assert from 'node:assert/strict'
async function findPage(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(['node_modules','.git','cache','src','public'].includes(entry.name))continue
  const path=join(dir,entry.name)
  if(entry.isDirectory()){const result=await findPage(path);if(result)return result}
  else if(entry.name.endsWith('.html')){const html=await readFile(path,'utf8');if(html.includes('Where does a shadow go?')&&html.includes('Example videos')&&html.includes('Create an account'))return html}
 }
}
const page=await findPage(process.cwd())
assert.ok(page,'Could not find the compiled example gallery')
assert.ok(page.includes('Create an account'),'Sign up link missing')
for(const value of ['Choose your credits','My credits','₦1,000','₦30,000','My projects','Checkout currency is NGN'])assert.ok(!page.includes(value),'Private dashboard text in visitor HTML: '+value)
console.log('Visitor page check passed: examples are visible and account details are hidden.')
