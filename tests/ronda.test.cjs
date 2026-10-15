const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('ronda.js','utf8');
function harness(initial=null) {
  let raw=initial, fail=false, downloaded=null;
  const messages={textContent:'',dataset:{}};
  const ctx={window:{BarreiroBridge:{DATA:{micros:[{id:'01'}],bairros:[]},getMap:()=>null},confirm:()=>true},
    document:{getElementById:id=>id==='rondaMessage'?messages:null,createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}},
    localStorage:{getItem:()=>raw,setItem:(k,v)=>{if(fail)throw new Error('Quota');raw=v}},
    navigator:{},Blob:class{constructor(parts){downloaded=parts.join('')}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout(){},console};
  const end="  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp,{once:true});\n  else startApp();";
  assert.ok(source.includes(end));
  const patched=source.replace(end,`  window.test={load,persist,finish,pause,erase,backupAll,recordGap,
    set:(h,c)=>{history=h;current=c},get:()=>({history,current,storageOk,loadFailed})};`);
  vm.createContext(ctx);vm.runInContext(patched,ctx);
  return {api:ctx.window.test,fail:()=>fail=true,raw:()=>raw,foreign:v=>raw=v,message:()=>messages.textContent,download:()=>downloaded};
}
function session(i=0,n=3,status='finished') {
  const t=Date.now()-600000;
  return {id:'r'+i,micro:'01',status,startedAt:t,resumedAt:status==='recording'?t:null,elapsedMs:1000,segment:0,
    points:Array.from({length:n},(_,j)=>({lat:-20,lng:-44,t:t+j*1000,seg:0,acc:10})),visits:[],gaps:[],meters:5000};
}
test('preserva mais de 15 rondas e mais de 4500 pontos após recarregar',()=>{
 const h=harness();h.api.load();h.api.set(Array.from({length:16},(_,i)=>session(i,5000)),null);assert.equal(h.api.persist(),true);
 const reopened=harness(h.raw());reopened.api.load();const v=reopened.api.get();assert.equal(v.history.length,16);assert.equal(v.history[0].points.length,5000);assert.equal(v.history[0].points[0].seg,0);
});
test('recuperação usa tempo confirmado no checkpoint, não até reabrir',()=>{
 const s=session(0,3,'recording');s.savedAt=s.startedAt+120000;s.savedElapsedMs=121000;
 const h=harness(JSON.stringify({v:1,current:s,history:[]}));h.api.load();const c=h.api.get().current;
 assert.equal(c.status,'paused');assert.equal(c.elapsedMs,121000);assert.equal(c.segment,1);assert.equal(c.gaps.at(-1).kind,'recuperacao');
});
test('legado sem checkpoint recupera somente até último registro conhecido',()=>{
 const s=session(0,3,'recording');const h=harness(JSON.stringify({v:1,current:s,history:[]}));h.api.load();assert.equal(h.api.get().current.elapsedMs,3000);
});
test('falha ao finalizar mantém ronda recuperável na memória e disco anterior intacto',()=>{
 const s=session(0,3,'recording');const h=harness();h.api.load();h.api.set([],s);h.api.persist();const old=h.raw();h.fail();h.api.finish();
 assert.equal(h.raw(),old);assert.equal(h.api.get().current.status,'paused');assert.equal(h.api.get().history.length,0);assert.equal(h.api.get().storageOk,false);assert.match(h.message(),/Não foi possível salvar/);
});
test('finalização bem-sucedida preserva histórico completo e remove corrente',()=>{
 const h=harness();h.api.load();h.api.set(Array.from({length:16},(_,i)=>session(i)),session(99,5001,'recording'));h.api.finish();
 const v=JSON.parse(h.raw());assert.equal(v.current,null);assert.equal(v.history.length,17);assert.equal(v.history[0].points.length,5001);assert.equal(v.history[0].status,'finished');
});
test('JSON corrompido nunca é sobrescrito e permite baixar original',()=>{
 const h=harness('{incompleto');h.api.load();assert.equal(h.api.persist(),false);assert.equal(h.raw(),'{incompleto');h.api.backupAll();assert.equal(h.download(),'{incompleto');
});
test('formato desconhecido é preservado sem sobrescrita',()=>{
 const raw=JSON.stringify({v:99,current:null,history:[]});const h=harness(raw);h.api.load();assert.equal(h.api.get().loadFailed,true);assert.equal(h.api.persist(),false);assert.equal(h.raw(),raw);
});
test('alteração observável em outra aba impede sobrescrita',()=>{
 const h=harness();h.api.load();h.api.set([],session(0,3,'recording'));h.foreign('{"v":1,"history":[]}');assert.equal(h.api.persist(),false);assert.equal(h.raw(),'{"v":1,"history":[]}');assert.equal(h.api.get().current.status,'paused');
});
test('backup conserva pontos ainda não gravados em caso de quota',()=>{
 const h=harness();h.api.load();h.api.set([],session(0,5000,'recording'));h.fail();h.api.persist();h.api.backupAll();const d=JSON.parse(h.download());assert.equal(d.data.current.points.length,5000);assert.equal(d.data.current.status,'paused');
});
test('eventos não são cortados depois do limite antigo de 300',()=>{
 const h=harness();h.api.load();const s=session(0,3,'paused');s.gaps=Array.from({length:301},(_,i)=>({kind:'old',t:i}));h.api.set([],s);h.api.recordGap('new','novo');assert.equal(JSON.parse(h.raw()).current.gaps.length,302);
});
test('falha ao excluir preserva histórico em memória e disco',()=>{
 const h=harness();h.api.load();h.api.set([session()],null);h.api.persist();const old=h.raw();h.fail();h.api.erase('r0');assert.equal(h.raw(),old);assert.equal(h.api.get().history.length,1);
});

test('pausas próximas sempre persistem o estado mesmo com evento deduplicado',()=>{
 const h=harness();h.api.load();const s=session(0,3,'recording');s.gaps=[{kind:'pausa',t:Date.now()}];h.api.set([],s);h.api.persist();h.api.pause();assert.equal(JSON.parse(h.raw()).current.status,'paused');
});

test('cartografia pública permanece idêntica à versão aprovada',()=>{
 const crypto=require('node:crypto');assert.equal(crypto.createHash('sha256').update(fs.readFileSync('micros.geojson')).digest('hex'),'fcb8cf2028bbe4f273a21f186084ae688b0219788ef1d43495db33c350a936fa');
});
