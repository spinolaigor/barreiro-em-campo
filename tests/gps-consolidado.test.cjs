const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('ronda.js','utf8');

function harness(){
  let raw=null,oneShot=null;
  const nodes=new Map(),get=id=>{
    if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,hidden:false,dataset:{},
      classList:{toggle(){},remove(){}},closest(){return {classList:{toggle(){}}}}});
    return nodes.get(id);
  };
  const shape={type:'Polygon',coordinates:[[[-44.5,-20.5],[-43.5,-20.5],[-43.5,-19.5],[-44.5,-19.5],[-44.5,-20.5]]]};
  const layer=()=>({addTo(){return this},setLatLng(){return this},setRadius(){return this},setStyle(){return this},bringToFront(){},bindPopup(){return this}});
  const map={on(){},removeLayer(){},setView(){},panTo(){},getCenter(){return {lat:-20,lng:-44}}};
  const L={circle:layer,circleMarker:layer,featureGroup:layer,polyline:layer};
  const ctx={window:{BarreiroBridge:{DATA:{micros:[{id:'01',geometry:shape}],bairros:[]},getMap:()=>map},L},
    document:{getElementById:id=>id==='rondaFab'?null:get(id)},L,console,Date,Math,setTimeout(){},
    navigator:{geolocation:{getCurrentPosition(ok,fail){oneShot={ok,fail}}}},
    localStorage:{getItem(){return raw},setItem(_key,val){raw=val}}};
  const end="  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp,{once:true});\n  else startApp();";
  assert.ok(source.includes(end));
  vm.createContext(ctx);
  vm.runInContext(source.replace(end,`  window.__gps={load,acceptGps,mark,pause,updateStatus,
    setCurrent:s=>current=s,setLastGps:p=>lastGps=p,
    setReceivedAt:t=>gpsStats.lastReceivedAt=t,
    get:()=>({current,lastGps,gpsState,gpsStats,markRefreshing})};`),ctx);
  const api=ctx.window.__gps;api.load();
  const t=Date.now();api.setCurrent({id:'r1',micro:'01',status:'recording',startedAt:t,resumedAt:t,
    elapsedMs:0,points:[],visits:[],gaps:[],segment:0,meters:0,outside:0,lastLocation:null});
  const fix=(lat=-20,lng=-44,accuracy=10,timestamp=Date.now())=>({coords:{latitude:lat,longitude:lng,accuracy},timestamp});
  return {api,get,fix,emit:(...args)=>api.acceptGps(fix(...args)),oneShot:()=>oneShot,raw:()=>raw};
}

test('contabiliza pontos aceitos, imóvel, fora da micro e precisão ruim sem gravar trajeto falso',()=>{
  const h=harness(),t=Date.now();
  h.emit(-20,-44,10,t-1000);h.emit(-20,-44,10,t);
  h.emit(-19.2,-43.2,10,t+1);h.emit(-20,-44,120,t+2);
  const s=h.api.get();
  assert.equal(s.current.points.length,1);
  assert.equal(s.gpsStats.received,4);
  assert.equal(s.gpsStats.accepted,1);
  assert.equal(s.gpsStats.ignored,3);
  assert.equal(s.gpsState,'impreciso');
});

test('leitura antiga e fora de ordem é descartada sem substituir último GPS',()=>{
  const h=harness(),t=Date.now();h.emit(-20,-44,10,t);
  h.emit(-20.01,-44.01,10,t-2000);
  assert.equal(h.api.get().current.points.length,1);
  assert.equal(h.api.get().lastGps.t,t);
  assert.match(h.api.get().gpsStats.lastResult,/antiga|ordem/);
  h.emit(-20.01,-44.01,10,t-80000);
  assert.equal(h.api.get().current.points.length,1);
});

test('sem atualização não afirma falha; erro do aparelho é distinguido',()=>{
  const h=harness();h.emit();h.api.setReceivedAt(Date.now()-41000);h.api.updateStatus();
  assert.match(h.get('rondaGpsStatus').textContent,/Sem nova leitura GPS/);
  assert.equal(h.get('rondaQuick').disabled,false);
  assert.equal(h.api.get().gpsState,'ok');
});

test('vistoria parada pede leitura nova e recusa localização antiga ou fora da micro',()=>{
  const h=harness();h.emit();h.api.setLastGps({...h.api.get().lastGps,t:Date.now()-45000});
  h.api.mark();assert.ok(h.oneShot());assert.equal(h.api.get().current.visits.length,0);
  h.oneShot().ok(h.fix(-20,-44,10,Date.now()-60000));
  assert.equal(h.api.get().current.visits.length,0);
  h.api.mark();h.oneShot().ok(h.fix(-19.2,-43.2));
  assert.equal(h.api.get().current.visits.length,0);
  h.api.mark();h.oneShot().ok(h.fix(-20,-44));
  assert.equal(h.api.get().current.visits.length,1);
  assert.equal(JSON.parse(h.raw()).current.visits.length,1);
});

test('resposta tardia depois de pausar não cria vistoria',()=>{
  const h=harness();h.api.mark();const pending=h.oneShot();h.api.pause();
  pending.ok(h.fix());
  assert.equal(h.api.get().current.visits.length,0);
  assert.equal(h.api.get().current.status,'paused');
});
