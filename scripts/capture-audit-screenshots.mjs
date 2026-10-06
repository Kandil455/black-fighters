import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const outDir = process.argv[3] || 'artifacts/site-audit/screenshots';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const routes = [
  ['01-landing','/'],['02-login','/login'],['03-register','/register'],['04-forgot-password','/forgot-password'],
  ['05-summary-a','/mockup/a'],['06-summary-b','/mockup/b'],['07-summary-c','/mockup/c'],['08-quiz','/mockup/quiz'],
  ['09-shared-quiz','/q/demo'],['10-dashboard','/dashboard'],['11-create','/create'],['12-quizzes','/quizzes'],
  ['13-tools','/tools'],['14-settings','/settings'],['15-admin','/admin']
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(path.join(os.tmpdir(),'bf-audit-'));
const port = 9300 + Math.floor(Math.random()*200);
const browser = spawn(chromePath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
async function getJson(url, options) { const r=await fetch(url,options); return r.json(); }
async function waitDebugger(){ for(let i=0;i<100;i++){try{return await getJson(`http://127.0.0.1:${port}/json/version`)}catch{} await sleep(100)} throw Error('Chrome did not start'); }
await waitDebugger();
const target=await getJson(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});
const ws=new WebSocket(target.webSocketDebuggerUrl); await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});
let id=0; const pending=new Map();
ws.addEventListener('message',({data})=>{const m=JSON.parse(data); if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
const evalJs=async expression=>(await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result?.value;
await mkdir(outDir,{recursive:true});
await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
const manifest=[];
for(const [name,route] of routes){
  await cmd('Page.navigate',{url:baseUrl+route});
  const start=Date.now(); let state={};
  while(Date.now()-start<15000){
    state=await evalJs(`(()=>({ready:document.readyState,root:!!document.querySelector('#root'),children:document.querySelector('#root')?.children?.length||0,text:(document.body?.innerText||'').trim().slice(0,700),path:location.pathname}))()`);
    if(state.ready==='complete'&&state.children>0&&state.text.length>20) break; await sleep(200);
  }
  await sleep(2200);
  await evalJs("[...document.querySelectorAll('button')].find(el => /'PY'|SKIP/.test(el.innerText))?.click()");
  await sleep(1200);
  state=await evalJs(`(()=>({path:location.pathname,text:(document.body?.innerText||'').trim().slice(0,900),rootChildren:document.querySelector('#root')?.children?.length||0}))()`);
  const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(path.join(outDir,`${name}.png`),Buffer.from(shot.data,'base64'));
  manifest.push({name,route,...state,elapsedMs:Date.now()-start});
}
await writeFile(path.join(outDir,'capture-manifest.json'),JSON.stringify(manifest,null,2));
const report=manifest.map(x=>`${x.name}\t${x.route}\t${x.path}\troot=${x.rootChildren}\t${x.text.replace(/\s+/g,' ').slice(0,180)}`).join('\n');
await writeFile(path.join(outDir,'capture-manifest.txt'),report+'\n');
console.log(report);
ws.close(); browser.kill('SIGTERM'); await Promise.race([new Promise(r=>browser.once('exit',r)),sleep(2000)]); await rm(profile,{recursive:true,force:true});
