const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('ronda.js','utf8');

function gpsHarness() {
  const now = Date.now();
  let raw = null, center = {lat:-20,lng:-44}, markerCount=0, panCount=0, viewCount=0;
  const nodes = new Map();
  const el = id => {
    if(!nodes.has(id)) nodes.set(id,{
      textContent:'',dataset:{},disabled:false,hidden:true, classList:{toggle(){},add(){},remove(){}},
      closest(){return {classList:{toggle(){}}};}
    });
    return nodes.get(id);
  };
  function layer(){
    return {
      position:null,radius:0,addTo(){return this;},setLatLng(p){this.position=p;return this;},
      setStyle(){return this;},setRadius(r){this.radius=r;return this;},
      bindPopup(){return this;}
    };
  }
  const L = {
    featureGroup:layer,polyline:layer,
    circleMarker(pos){markerCount++;const x=layer();x.position=pos;return x;},
    circle(pos,opts){const x=layer();x.position=pos;x.radius=opts.radius;return x;}
  };
  const map = {
    removeLayer(){},getZoom(){return 14;},getCenter(){return center;},
    setView(p){viewCount++;center={lat:p[0],lng:p[1]};},
    panTo(p){panCount++;center={lat:p[0],lng:p[1]};}
  };
  const geom={type:'Polygon',coordinates:[[[-44.5,-20.5],[-43.5,-20.5],[-43.5,-19.5],[-44.5,-19.5],[-44.5,-20.5]]]};
  const ctx={
    window:{BarreiroBridge:{DATA:{micros:[{id:'01',geometry:geom}],bairros:[]},getMap:()=>map},L},
    L, document:{getElementById:el}, navigator:{}, localStorage:{
      getItem(){return raw;}, setItem(_k,v){raw=v;}
    }, console,setTimeout(){},clearTimeout(){}
  };
  const end="  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp,{once:true});\n  else startApp();";
  assert.ok(source.includes(end));
  const hook="  window.testGPS={load,acceptGps,updateStatus,mark,drawLivePosition,"+
    "setCurrent:s=>current=s,setLastFixTime:t=>{if(lastGps)lastGps.t=t;},"+
    "setFollow:x=>{followGps=x;},get:()=>({current,lastGps,gpsState,gpsStats,liveMarker,liveAccuracy})};";
  const patched=source.replace(end,hook);
  vm.createContext(ctx);vm.runInContext(patched,ctx);
  const api=ctx.window.testGPS;api.load();
  api.setCurrent({id:'test',micro:'01',status:'recording',startedAt:now,resumedAt:now,
    elapsedMs:0,points:[],visits:[],gaps:[],segment:0,meters:0,outside:0,lastLocation:null});
  return {
    api, el,
    emit:(lat,lng,accuracy=12,time=Date.now())=>api.acceptGps({
      coords:{latitude:lat,longitude:lng,accuracy},timestamp:time
    }),
    mapStats:()=>({markerCount,panCount,viewCount,center}),
    data:()=>raw?JSON.parse(raw):null
  };
}

test('GPS válido cria marcador independente e salva ponto dentro da micro',()=>{
  const h=gpsHarness();h.emit(-20,-44);
  const s=h.api.get();
  assert.equal(s.gpsState,'ok');
  assert.equal(s.current.points.length,1);
  assert.equal(s.gpsStats.received,1);
  assert.equal(s.gpsStats.accepted,1);
  assert.ok(s.liveMarker);
  assert.ok(s.liveAccuracy);
  assert.equal(h.mapStats().viewCount,1);
});

test('fora da micro a posição aparece, mas nenhum trajeto é gravado',()=>{
  const h=gpsHarness();h.emit(-19.2,-43.2);
  assert.equal(h.api.get().gpsState,'fora');
  assert.equal(h.api.get().current.points.length,0);
  assert.ok(h.api.get().liveMarker);
  assert.match(h.api.get().gpsStats.lastResult,/Fora da micro/);
});

test('precisão de 120 metros mostra localização aproximada e não grava trecho',()=>{
  const h=gpsHarness();h.emit(-20,-44,120);
  assert.equal(h.api.get().gpsState,'impreciso');
  assert.equal(h.api.get().current.points.length,0);
  assert.ok(h.api.get().liveMarker);
  assert.equal(h.api.get().liveAccuracy.radius,120);
});

test('leitura antiga não altera localização nem percurso',()=>{
  const h=gpsHarness();h.emit(-20,-44,15,Date.now()-65000);
  assert.equal(h.api.get().gpsState,'sem_sinal');
  assert.equal(h.api.get().current.points.length,0);
  assert.equal(h.api.get().liveMarker,null);
  assert.match(h.api.get().gpsStats.lastResult,/antiga/);
});

test('parado recebe atualização visual, mas não cria pontos falsos',()=>{
  const h=gpsHarness();h.emit(-20,-44);
  h.emit(-20,-44,10,Date.now());
  assert.equal(h.api.get().gpsStats.received,2);
  assert.equal(h.api.get().current.points.length,1);
  assert.equal(h.api.get().gpsState,'ok');
  assert.match(h.api.get().gpsStats.lastResult,/Pouco deslocamento/);
});

test('sem novas posições painel avisa e desabilita marcação de vistoria',()=>{
  const h=gpsHarness();h.emit(-20,-44);
  h.api.setLastFixTime(Date.now()-40000);h.api.updateStatus();
  assert.match(h.el('rondaGpsStatus').textContent,/sem atualização/);
  assert.equal(h.el('rondaQuick').disabled,true);
  assert.match(h.el('rondaLastFix').textContent,/desatualizado/);
});

test('desligar acompanhamento não impede registrar deslocamento',()=>{
  const h=gpsHarness();h.emit(-20,-44);
  h.api.setFollow(false);
  const before=h.mapStats().panCount;
  h.emit(-20.001,-44.001);
  assert.equal(h.mapStats().panCount,before);
  assert.equal(h.api.get().current.points.length,2);
});

test('marcação com localização antiga é recusada',()=>{
  const h=gpsHarness();h.emit(-20,-44);
  h.api.setLastFixTime(Date.now()-45000);
  h.api.mark();
  assert.equal(h.api.get().current.visits.length,0);
});
