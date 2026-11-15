import {mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/config',{recursive:true});
const page=readFileSync('worker/page.js','utf8');
let source=readFileSync('worker/index.js','utf8').replace("import {page} from './page.js';",page.replace('export const page=','const page='));
const presentation=readFileSync('docs/presentation.pptx').toString('base64'),readme=readFileSync('README.md','utf8');
const routes="const pathname=new URL(req.url).pathname;if(pathname==='/presentation'||pathname==='/presentation.pptx')return new Response(Uint8Array.from(atob("+JSON.stringify(presentation)+"),c=>c.charCodeAt(0)),{headers:{'content-type':'application/vnd.openxmlformats-officedocument.presentationml.presentation','content-disposition':'attachment; filename=\"HackCampus.pptx\"'}});if(pathname==='/README.md')return new Response("+JSON.stringify(readme)+",{headers:{'content-type':'text/plain; charset=utf-8'}});if(pathname==='/health')return new Response('{\"ok\":true}',{headers:{'content-type':'application/json'}});";
source=source.replace("try{if(new URL(req.url).pathname.startsWith('/api/'))","try{"+routes+"if(new URL(req.url).pathname.startsWith('/api/'))");
writeFileSync('dist/server/index.js',source);copyFileSync('config/deployment.json','dist/config/deployment.json');
console.log('Worker built');
