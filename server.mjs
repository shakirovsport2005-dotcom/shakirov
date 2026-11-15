import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import worker from './worker/index.js';
const root=dirname(fileURLToPath(import.meta.url));
const dbPath=process.env.DB_PATH||resolve(root,'data/campus.sqlite');
mkdirSync(dirname(dbPath),{recursive:true});
const sqlite=new DatabaseSync(dbPath);
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
sqlite.exec(readFileSync(resolve(root,'drizzle/0000_state.sql'),'utf8').replace('CREATE TABLE ','CREATE TABLE IF NOT EXISTS '));
export const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return sqlite.prepare(sql).get(...args)},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}}}};
const server=http.createServer(async(req,res)=>{try{let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>100000){res.writeHead(413).end();return}chunks.push(chunk)}const body=Buffer.concat(chunks);const url=new URL(req.url,process.env.PUBLIC_ORIGIN||'http://'+req.headers.host);
if(req.method==='GET'&&['/presentation','/presentation.pptx','/README.md','/health'].includes(url.pathname)){if(url.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'}).end('{"ok":true,"app":"hackcampus"}');return}const isDeck=url.pathname.startsWith('/presentation');const path=resolve(root,isDeck?'docs/presentation.pptx':'README.md');if(existsSync(path)){res.writeHead(200,isDeck?{'content-type':'application/vnd.openxmlformats-officedocument.presentationml.presentation','content-disposition':'attachment; filename="HackCampus.pptx"'}:{'content-type':'text/plain; charset=utf-8'}).end(readFileSync(path));return}}
const request=new Request(url,{method:req.method,headers:req.headers,...(body.length?{body}: {})});const response=await worker.fetch(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch{res.writeHead(500).end('Server error')}});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('HackCampus listening: http://'+(process.env.HOST||'127.0.0.1')+':'+(process.env.PORT||3000)));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Порт занят. Закройте предыдущий запуск или задайте PORT=3001.':e.message);process.exitCode=1});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{sqlite.close();process.exit(0)}));
