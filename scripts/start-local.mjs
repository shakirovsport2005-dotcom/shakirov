import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {mkdirSync,createWriteStream,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const flags=new Set(process.argv.slice(2));
const diagnose=flags.has('--diagnose');
mkdirSync(resolve(root,'data'),{recursive:true});
const logPath=resolve(root,'data/startup.log');
const log=createWriteStream(logPath,{flags:'w'});
let child,stopping=false;
function message(s){console.log(s);if(!log.writableEnded)log.write(s+'\n')}
function available(port){return new Promise((yes,no)=>{const s=net.createServer();s.once('error',e=>['EADDRINUSE','EACCES'].includes(e.code)?yes(false):no(e));s.listen({host:'127.0.0.1',port},()=>s.close(()=>yes(true)))})}
function systemPort(){return new Promise((yes,no)=>{const s=net.createServer();s.once('error',no);s.listen({host:'127.0.0.1',port:0},()=>{const p=s.address().port;s.close(()=>yes(p))})})}
function health(port){return new Promise((yes,no)=>{const req=http.get({hostname:'127.0.0.1',port,path:'/health',timeout:1200},res=>{let body='';res.setEncoding('utf8');res.on('data',s=>body+=s);res.on('end',()=>{try{const v=JSON.parse(body);if(res.statusCode===200&&v.ok===true&&v.app==='hackcampus')yes();else no(Error('Unexpected service response'))}catch{no(Error('Unexpected service response'))}})});req.on('timeout',()=>req.destroy(Object.assign(Error('HTTP timeout'),{code:'ETIMEDOUT'})));req.on('error',no)})}
function stop(){if(stopping)return;stopping=true;if(child&&child.exitCode===null)child.kill();log.end()}
async function main(){
 for(const file of ['server.mjs','worker/index.js','worker/page.js','drizzle/0000_state.sql'])if(!existsSync(resolve(root,file)))throw Error('Missing '+file+'. Extract the complete ZIP before starting.');
 let port=Number(process.env.PORT||3000);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be a number from 1 to 65535.');
 if(!await available(port)){message('Default port is unavailable. Selecting a system-assigned port.');port=await systemPort()}
 const url='http://127.0.0.1:'+port;
 message('Starting HackCampus. Checking the HTTP server...');
 child=spawn(process.execPath,[resolve(root,'server.mjs')],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:url},stdio:['inherit','pipe','pipe'],windowsHide:true});
 child.stdout.on('data',s=>{process.stdout.write(s);if(!log.writableEnded)log.write(s)});
 child.stderr.on('data',s=>{process.stderr.write(s);if(!log.writableEnded)log.write(s)});
 let spawnError;child.on('error',e=>{spawnError=e});
 let lastError;
 for(let i=0;i<24;i++){
  if(spawnError)throw spawnError;
  if(child.exitCode!==null)throw Error('Server exited with code '+child.exitCode+'. See the error above.');
  try{await health(port);lastError=null;break}catch(e){lastError=e;if(e.code==='EACCES'||e.code==='EPERM')break;await new Promise(r=>setTimeout(r,400))}
 }
 if(lastError)throw Error('The local HTTP connection failed ('+(lastError.code||lastError.message)+'). The server is not confirmed ready.');
 message('READY: '+url);
 message('Login: student@hackcampus.demo    Password: Campus2026!');
 message('Keep this window open. Press Ctrl+C to stop.');
 if(diagnose){message('HTTP readiness check passed.');stop();return}
 if(!flags.has('--no-browser')){
  let opener;
  if(process.platform==='win32')opener=spawn(process.env.ComSpec||'cmd.exe',['/d','/c','start','',url],{stdio:'ignore',windowsHide:true});
  else if(process.platform==='darwin')opener=spawn('open',[url],{stdio:'ignore'});
  else opener=spawn('xdg-open',[url],{stdio:'ignore'});
  opener.on('error',()=>message('Open the READY address above in your browser.'));opener.unref();
 }
 child.on('exit',code=>{if(!stopping){message('Server stopped'+(code?' (code '+code+')':'')+'.');log.end();process.exitCode=code||0}});
}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
main().catch(e=>{message('STARTUP ERROR: '+e.message);message('Diagnostic log: '+logPath);process.exitCode=1;stop()});
