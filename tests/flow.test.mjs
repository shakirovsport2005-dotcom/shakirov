import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import worker from '../worker/index.js';
function database(sqlite){return {prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return sqlite.prepare(sql).get(...args)},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}}}}}}}
test('Сквозной сценарий, права, дедлайн, сохранение и отсутствие дублей',async()=>{const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_state.sql','utf8'));let env={DB:database(sqlite)};
async function call(path,body,cookie=''){return worker.fetch(new Request('https://test/api/'+path,{method:body?'POST':'GET',headers:{cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env)}
async function login(name){const r=await call('login',{email:name+'@hackcampus.demo',password:'Campus2026!'});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
assert.equal((await call('state')).status,401);const student=await login('student'),judge=await login('judge'),org=await login('organizer'),fresh=await login('new'),member=await login('member');
assert.equal((await call('publish',{event:'h1'},student)).status,403);assert.equal((await call('submission',{team:'t2',title:'Чужое',description:'x',url:'https://example.org'},student)).status,403);
assert.equal((await call('team',{event:'h1',code:'ORBITA26',role:'Аналитик'},fresh)).status,200);assert.equal((await call('team',{event:'h1',name:'Дубль',role:'x'},fresh)).status,409);
assert.equal((await call('submission',{team:'t1',title:'Campus Flow',description:'Бронирование аудиторий',url:'https://example.org/project'},student)).status,200);
assert.equal((await call('review',{team:'t1',status:'accepted'},org)).status,200);
assert.equal((await call('score',{team:'t1',scores:[80,80,80,101],comment:'x'},judge)).status,400);
assert.equal((await call('publish',{event:'h1'},org)).status,409);assert.equal((await call('close',{event:'h1'},org)).status,200);assert.equal((await call('publish',{event:'h1'},org)).status,409);
assert.equal((await call('score',{team:'t1',scores:[80,80,80,80],comment:'Хороший прототип'},judge)).status,200);
const hidden=await(await call('state',undefined,student)).json();assert.equal(hidden.teams[0].scores,undefined);assert.equal(hidden.users[0].password,undefined);
assert.equal((await call('publish',{event:'h1'},org)).status,200);assert.equal((await call('publish',{event:'h1'},org)).status,200);
for(const account of [student,member,fresh]){const state=await(await call('state',undefined,account)).json();assert.equal(state.ledger.length,1);assert.equal(state.ledger[0].points,70);assert.equal(state.teams.find(t=>t.id==='t1').place,2)}
const stored=JSON.parse(sqlite.prepare('SELECT body FROM app_state').get().body);assert.deepEqual(stored.ledger.filter(l=>l.user==='s4').map(l=>l.points),[100]);assert.deepEqual(stored.ledger.filter(l=>l.user==='s5').map(l=>l.points),[50]);assert.deepEqual(stored.ledger.filter(l=>l.user==='s6').map(l=>l.points),[10]);
env={DB:database(sqlite)};assert.equal((await(await call('state',undefined,student)).json()).ledger[0].points,70);
assert.equal((await call('score',{team:'t1',scores:[90,90,90,90],comment:'После публикации'},judge)).status,409);
assert.equal((await call('event',{title:'Новый',description:'Проверка',deadline:'2027-01-01',judge:'j1',weights:[35,30,20,15]},org)).status,200);
let s=JSON.parse(sqlite.prepare('SELECT body FROM app_state').get().body);const e=s.events.at(-1);assert.equal((await call('team',{event:e.id,name:'Новая',role:'Разработчик'},fresh)).status,200);s=JSON.parse(sqlite.prepare('SELECT body FROM app_state').get().body);s.events.at(-1).deadline='2020-01-01';sqlite.prepare('UPDATE app_state SET body=?').run(JSON.stringify(s));assert.equal((await call('submission',{team:s.teams.at(-1).id,title:'Поздно',description:'x',url:'https://example.org'},fresh)).status,409);
});
