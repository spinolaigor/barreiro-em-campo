const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('localizacao-campo.js','utf8');

function harness(bairroGeometry=null){
  const nodes=new Map();let view=0,move=0;
  let center={lat:-20.01,lng:-44.01};
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true,href:'',dataset:{},setAttribute(){}});
    return nodes.get(id);
  };
  const layer=()=>({addTo(){return this},setLatLng(){return this},setRadius(){return this},setStyle(){return this}});
  const L={circleMarker(){return layer()},circle(){return layer()}};
  const geo={type:'Polygon',coordinates:[[[-44.2,-20.2],[-43.8,-20.2],[-43.8,-19.8],[-44.2,-19.8],[-44.2,-20.2]]]};
  const bridge={DATA:{micros:[{id:'05',geometry:geo}],bairros:[{nome:'Bairro de Teste',micro:'05',geometry:bairroGeometry||geo}]},getMap:()=>({
    setView(coords){view++;center={lat:coords[0],lng:coords[1]}},
    panTo(coords){move++;center={lat:coords[0],lng:coords[1]}},
    getCenter(){return center}
  })};
  const ctx={window:{BarreiroBridge:bridge,L,isSecureContext:true},
    document:{readyState:'loading',addEventListener(){},getElementById:node},
    L,navigator:{geolocation:{clearWatch(){}}},console,Date,Math,
    setInterval(){return 1},clearInterval(){}};
  const target="  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});";
  assert.ok(source.includes(target));
  const replacement="  window.__where_test={position,gpsError,territory,stop,setOpened:v=>opened=v};\n"+target;
  vm.createContext(ctx);vm.runInContext(source.replace(target,replacement),ctx);
  const api=ctx.window.__where_test;
  api.setOpened(true);
  return {api,node,stats:()=>({view,move}),emit:(lat,lng,accuracy=10,t=Date.now())=>
    api.position({coords:{latitude:lat,longitude:lng,accuracy},timestamp:t})};
}

test('ponto com precisão válida mostra micro e bairro sem inventar nome da rua',()=>{
  const h=harness();h.emit(-20,-44);
  assert.equal(h.node('whereMicro').textContent,'Micro 05');
  assert.equal(h.node('whereBairro').textContent,'Bairro de Teste');
  assert.match(h.node('whereRoad').textContent,/Veja o nome da rua/);
  assert.ok(h.node('whereMaps').href.startsWith('https://www.google.com/maps/search/'));
  assert.equal(h.stats().view,1);
});

test('GPS fora da micro mostra localização real sem atribuir região incorreta',()=>{
  const h=harness();h.emit(-19.3,-43.2);
  assert.equal(h.node('whereMicro').textContent,'Fora das dez micros');
  assert.match(h.node('whereBairro').textContent,/não identificado/);
  assert.equal(h.stats().view,1);
});

test('posição antiga é recusada e não move o mapa',()=>{
  const h=harness();h.emit(-20,-44,8,Date.now()-70000);
  assert.equal(h.stats().view,0);
  assert.match(h.node('whereStatus').textContent,/antiga ou inválida/);
});

test('posição muito imprecisa é recusada e apresenta explicação',()=>{
  const h=harness();h.emit(-20,-44,1200);
  assert.equal(h.stats().view,0);
  assert.match(h.node('whereStatus').textContent,/impreciso/);
});

test('GPS negado apresenta orientação sobre permissões',()=>{
  const h=harness();h.api.gpsError({code:1});
  assert.match(h.node('whereStatus').textContent,/Permissão do GPS negada/);
});

test('bairro GeometryCollection com Polygon é reconhecido pelo GPS',()=>{
  const geom={type:'GeometryCollection',geometries:[
    {type:'LineString',coordinates:[[-44.02,-20.02],[-44.01,-20.02]]},
    {type:'Polygon',coordinates:[[[-44.1,-20.1],[-43.9,-20.1],[-43.9,-19.9],[-44.1,-19.9],[-44.1,-20.1]]]}
  ]};
  const h=harness(geom);h.emit(-20,-44);
  assert.equal(h.node('whereBairro').textContent,'Bairro de Teste');
});
