const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('ronda.js','utf8');

function harness(){
  const layers=[],events={},stats={views:0,pans:0,removed:0};
  let center={lat:-20,lng:-44};
  const map={
    on(type,cb){events[type]=cb},
    getCenter(){return center},
    setView(ll){stats.views++;center={lat:ll[0],lng:ll[1]}},
    panTo(ll){stats.pans++;center={lat:ll[0],lng:ll[1]}},
    removeLayer(layer){stats.removed++;layer.removed=true}
  };
  const layer=type=>({
    type,latLng:null,removed:false,
    addTo(){layers.push(this);return this},
    setLatLng(ll){this.latLng=ll;return this},
    setRadius(v){this.radius=v;return this},
    bringToFront(){return this}
  });
  const L={
    circleMarker(ll){return layer('marker').setLatLng(ll)},
    circle(ll){return layer('accuracy').setLatLng(ll)}
  };
  const bridge={DATA:{micros:[{id:'01'}],bairros:[]},getMap:()=>map};
  const ctx={window:{BarreiroBridge:bridge,L},
    document:{readyState:'loading',addEventListener(){}},L,console,Date,Math};
  const needle="  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp,{once:true});";
  assert.ok(source.includes(needle));
  const injected="  window.__testLive={showLivePosition,clearLivePosition,getFollow:()=>followLive};\n"+needle;
  vm.createContext(ctx);vm.runInContext(source.replace(needle,injected),ctx);
  return {api:ctx.window.__testLive,layers,events,stats};
}

test('posição ao vivo cria marcador e círculo de precisão, atualizados sem duplicação',()=>{
  const h=harness();h.api.showLivePosition({lat:-20,lng:-44,acc:12});
  assert.equal(h.layers.length,2);
  assert.equal(h.layers.find(x=>x.type==='marker').latLng[0],-20);
  assert.equal(h.stats.views,1);
  h.api.showLivePosition({lat:-20.001,lng:-44.001,acc:8});
  assert.equal(h.layers.length,2);
  assert.equal(h.layers.find(x=>x.type==='marker').latLng[0],-20.001);
  assert.equal(h.layers.find(x=>x.type==='accuracy').radius,8);
  assert.equal(h.stats.pans,1);
});
test('arrastar mapa interrompe seguimento mas atualiza o marcador',()=>{
  const h=harness();h.api.showLivePosition({lat:-20,lng:-44,acc:8});
  h.events.dragstart();
  assert.equal(h.api.getFollow(),false);
  h.api.showLivePosition({lat:-20.002,lng:-44.002,acc:7});
  assert.equal(h.stats.pans,0);
  assert.equal(h.layers.find(x=>x.type==='marker').latLng[0],-20.002);
});
test('parar GPS remove marcador, sem apagar registros da ronda',()=>{
  const h=harness();h.api.showLivePosition({lat:-20,lng:-44,acc:8});
  h.api.clearLivePosition();
  assert.equal(h.stats.removed,2);
  assert.equal(h.layers.filter(x=>x.removed).length,2);
});
