const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('ronda.js','utf8');

function harness(){
  let raw=null,oneShot=null;
  const shape={type:'Polygon',coordinates:[[[-44.5,-20.5],[-43.5,-20.5],[-43.5,-19.5],[-44.5,-19.5],[-44.5,-20.5]]]};
  const node=id=>({textContent:'',hidden:false,dataset:{},classList:{toggle(){},remove(){}},closest(){return {classList:{toggle(){}}}}});
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)};
  const layer=()=>({addTo(){return this},setLatLng(){return this},setRadius(){return this},setStyle(){return this},bringToFront(){},bindPopup(){return this}});
  const map={on(){},removeLayer(){},setView(){},panTo(){},getCenter(){return {lat:-20,lng:-44}}};
  const L={circle:layer,circleMarker:layer,featureGroup:layer,polyline:layer};
  const ctx={
    window:{BarreiroBridge:{DATA:{micros:[{id:'01',geometry:shape}],bairros:[{nome:'Bairro de Teste',geometry:shape}]},getMap:()=>map},L},
    document:{getElementById:id=>id==='rondaFab'?null:get(id)},navigator:{geolocation:{
      getCurrentPosition(ok,fail){oneShot={ok,fail}}
    }},L,Date,Math,console,setTimeout(){},
    localStorage:{getItem(){return raw},setItem(_k,val){raw=val}}
  };
  const end="  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp,{once:true});\n  else startApp();";
  assert.ok(source.includes(end));
  vm.createContext(ctx);
  vm.runInContext(source.replace(end,"  window.__test={load,acceptGps,pause,setCurrent:s=>current=s,getCurrent:()=>current};"),ctx);
  ctx.window.__test.load();
  const now=Date.now();
  ctx.window.__test.setCurrent({id:'r1',micro:'01',status:'recording',startedAt:now,resumedAt:now,
    elapsedMs:0,points:[],visits:[],gaps:[],segment:0,meters:0,lastLocation:null});
  const position=(lat=-20,lng=-44,accuracy=10,timestamp=Date.now())=>
    ({coords:{latitude:lat,longitude:lng,accuracy},timestamp});
  return {api:ctx.window.BarreiroRondaUI,internal:ctx.window.__test,position,
    emit:(...a)=>ctx.window.__test.acceptGps(position(...a)),
    callback:()=>oneShot,raw:()=>raw,get};
}

test('marca buraco com um toque, preserva coordenadas e não inventa rua nem número',()=>{
  const h=harness();h.emit(-20,-44,9);
  let output;h.api.marcarBuraco((record,msg)=>{output=record});
  assert.equal(output.codigo,'B001');
  assert.equal(output.bairro,'Bairro de Teste');
  assert.equal(output.logradouro,null);
  assert.equal(output.numeroAproximado,null);
  assert.equal(output.acc,9);
  assert.equal(h.internal.getCurrent().potholes.length,1);
  assert.equal(h.internal.getCurrent().visits.length,0);
  assert.equal(JSON.parse(h.raw()).current.potholes[0].codigo,'B001');
});

test('marcação por GPS ruim ou fora da micro é recusada sem gravar',()=>{
  const h=harness();let result='pending';
  h.emit(-20,-44,125);
  h.api.marcarBuraco(p=>result=p);
  h.callback().ok(h.position(-19.2,-43.2,10));
  assert.equal(result,null);
  assert.equal((h.internal.getCurrent().potholes||[]).length,0);
});

test('ponto antigo exige GPS atualizado; atraso depois da pausa não marca',()=>{
  const h=harness();let result='pending';
  h.api.marcarBuraco(p=>result=p);
  const callback=h.callback();
  assert.ok(callback);
  h.internal.pause();
  callback.ok(h.position());
  assert.equal((h.internal.getCurrent().potholes||[]).length,0);
});

test('número e rua são opcionais, editáveis, e histórico antigo continua legível',()=>{
  const h=harness();h.emit();h.api.marcarBuraco(()=>{});
  assert.equal(h.api.editarBuraco('r1','B001','Rua Teste','120'),true);
  const p=h.api.listarBuracos()[0].potholes[0];
  assert.equal(p.logradouro,'Rua Teste');
  assert.equal(p.numeroAproximado,'120');
  assert.equal(h.api.desfazerBuraco(),true);
  assert.equal(h.api.listarBuracos()[0].potholes.length,0);
});

test('CSV preserva um registro por ponto e agrupa por bairro e via',()=>{
  const code=fs.readFileSync('ocorrencias.js','utf8');
  const env={document:{readyState:'loading',addEventListener(){}},window:{},Date,Math,setTimeout,setInterval(){}};
  vm.createContext(env);vm.runInContext(code,env);
  const api=env.window.BarreiroBuracosFormat;
  const rows=[
    {ronda:'r1',codigo:'B001',t:Date.now(),micro:'01',bairro:'Bairro A',logradouro:'Rua A',numeroAproximado:'12',lat:-20,lng:-44,acc:8},
    {ronda:'r1',codigo:'B002',t:Date.now(),micro:'01',bairro:'Bairro A',logradouro:'Rua A',lat:-20,lng:-44.01,acc:10}
  ];
  const csv=api.csv(rows);
  assert.equal(csv.trim().split('\r\n').length,3);
  assert.match(csv,/Rua A/);
  assert.equal(api.groupRows(rows)[0][1],2);
  assert.match(api.report(rows),/Imprimir \/ Salvar como PDF/);
  assert.doesNotMatch(api.report(rows),/<script>/);
});

test('arquivos da funcionalidade estão referenciados e workflow copia todos',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const wf=fs.readFileSync('.github/workflows/pages.yml','utf8');
  assert.match(html,/ocorrencias\.js\?v=/);
  assert.match(html,/ocorrencias\.css\?v=/);
  assert.match(wf,/cp .*ocorrencias\.js ocorrencias\.css/);
  assert.doesNotThrow(()=>new vm.Script(fs.readFileSync('ocorrencias.js','utf8')));
});
