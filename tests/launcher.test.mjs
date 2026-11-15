import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {spawnSync} from 'node:child_process';

test('Windows launcher uses ASCII and CRLF',()=>{
 const bytes=readFileSync('start.cmd');
 assert.ok(bytes.every(b=>b<128));
 assert.ok(!/(?<!\r)\n/.test(bytes.toString('ascii')));
});

test('Extracted launcher works in a path with spaces without Node in PATH',{skip:process.platform!=='win32'},()=>{
 const workspace=resolve('.');
 const dir=mkdtempSync(join(workspace,'launcher test '));
 try{
  copyFileSync('start.cmd',join(dir,'start.cmd'));
  copyFileSync('server.mjs',join(dir,'server.mjs'));
  const env={...process.env,PATH:join(process.env.SystemRoot||'C:\\Windows','System32')};
  const r=spawnSync(process.env.ComSpec||'C:\\Windows\\System32\\cmd.exe',['/d','/c','start.cmd --check'],{cwd:dir,env,encoding:'utf8',timeout:15000});
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
  assert.ok(r.stdout.includes('Launcher and SQLite check passed.'));
 }finally{
  assert.ok(resolve(dir).startsWith(workspace+sep));
  rmSync(dir,{recursive:true,force:true});
 }
});
