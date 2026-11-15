import {readFileSync} from 'node:fs';import {inflateRawSync} from 'node:zlib';import assert from 'node:assert/strict';import vm from 'node:vm';import {page} from '../worker/page.js';
const pptx=readFileSync('docs/presentation.pptx'),entries=new Map();
let end=pptx.length-22;while(end>=Math.max(0,pptx.length-65557)&&pptx.readUInt32LE(end)!==0x06054b50)end--;
assert.ok(end>=0,'PPTX must contain a ZIP directory');
let offset=pptx.readUInt32LE(end+16);const count=pptx.readUInt16LE(end+10);
for(let i=0;i<count;i++){
 assert.equal(pptx.readUInt32LE(offset),0x02014b50);
 const method=pptx.readUInt16LE(offset+10),size=pptx.readUInt32LE(offset+20),nameLen=pptx.readUInt16LE(offset+28),extraLen=pptx.readUInt16LE(offset+30),commentLen=pptx.readUInt16LE(offset+32),local=pptx.readUInt32LE(offset+42);
 const name=pptx.subarray(offset+46,offset+46+nameLen).toString('utf8');
 const start=local+30+pptx.readUInt16LE(local+26)+pptx.readUInt16LE(local+28),bytes=pptx.subarray(start,start+size);
 assert.ok(method===0||method===8);entries.set(name,method===8?inflateRawSync(bytes):bytes);offset+=46+nameLen+extraLen+commentLen;
}
const slides=[...entries.keys()].filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));assert.equal(slides.length,7);
for(const n of [4,6])assert.ok(entries.get(`ppt/slides/slide${n}.xml`).toString('utf8').includes('<a:tbl>'),'Native editable tables are required');
assert.ok(entries.get('ppt/slides/slide5.xml').toString('utf8').includes('+70'));
assert.ok([...entries.keys()].filter(name=>name.startsWith('ppt/media/')).length>=4,'Images must be embedded');
const script=page.match(/<script>([\s\S]*)<\/script>/)[1];new vm.Script(script);
for(const file of ['README.md','SUBMISSION.md','docs/presentation.pptx','start.cmd','Dockerfile','compose.yaml'])assert.ok(readFileSync(file).length>100);
for(const name of ['submission','judging','publication','profile','results']){const capture=readFileSync('docs/captures/'+name+'.html','utf8');assert.ok(capture.includes('Демонстрационные данные'));if(name==='profile'){assert.ok(capture.includes('+70 баллов'));assert.ok(capture.includes('2 место'))}}
console.log('PPTX: 7 slides, native tables, embedded images, +70 scenario and project deliverables verified.');
