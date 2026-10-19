const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(){
  const window={BarreiroBridge:{DATA:{micros:[{id:'07',geometry:{
    type:'Polygon',coordinates:[[[-44.04,-20.03],[-44.01,-20.03],[-44.01,-20.00],[-44.04,-20.00],[-44.04,-20.03]]]
  }}]}},BarreiroEndereco:{vias:[],__teste:{utm23s:(lat,lng)=>[lng*1000,lat*1000]}}};
  const ctx={window,Uint8Array,Date,Math,Number,Array,Map,String};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('relatorio-pdf.js','utf8'),ctx);
  return window.BarreiroPDF;
}
test('relatorio de execução inclui resumo, mapa, percurso e identificadores individuais',()=>{
  const t=Date.now();
  const entries=[
    {codigo:'B001',t,bairro:'Mangueiras',logradouro:'Rua Nome de Teste',numeroAproximado:'120',lat:-20.012,lng:-44.015,acc:8},
    {codigo:'B002',t:t+100,bairro:'Mangueiras',logradouro:'Rua Nome de Teste',numeroAproximado:'120',lat:-20.012,lng:-44.015,acc:8},
    {codigo:'B003',t:t+200,bairro:'Independencia',logradouro:'Rua Outra',numeroAproximado:'77',lat:-20.020,lng:-44.021,acc:8}
  ];
  const round={id:'ronda-07',micro:'07',startedAt:t-3600000,endedAt:t,elapsedMs:2700000,meters:3845,
    points:[{lat:-20.01,lng:-44.017,seg:0},{lat:-20.012,lng:-44.015,seg:0},
      {lat:-20.02,lng:-44.02,seg:1},{lat:-20.022,lng:-44.023,seg:1}]};
  const out=Buffer.from(harness().create(entries,round)).toString('latin1');
  assert.match(out,/%PDF-1.4/);
  assert.match(out,/RELATORIO DE EXECUCAO DA RONDA/);
  assert.match(out,/DISTANCIA GPS/);
  assert.match(out,/3,85 km/);
  assert.match(out,/TEMPO ATIVO/);
  assert.match(out,/MAPA DA MICRO E PERCURSO REALIZADO/);
  assert.match(out,/BURACOS POR BAIRRO/);
  assert.match(out,/Mangueiras/);
  assert.match(out,/B001/);assert.match(out,/B002/);assert.match(out,/B003/);
  assert.match(out,/Rua Nome de Teste - Proximo ao n. 120/);
  assert.match(out,/re W n/);
  assert.match(out,/\/Count 2 /);
});
test('91 IDs sao mantidos, sem deduplicar buracos com GPS e endereco identicos',()=>{
  const t=Date.now();
  const entries=Array.from({length:91},(_,i)=>({codigo:'B'+String(i+1).padStart(3,'0'),
    t:t+i*1000,bairro:i%3?'Petropolis':'Mangueiras',logradouro:'Rua de Teste',
    numeroAproximado:'20',lat:-20.012,lng:-44.018,acc:9}));
  const binary=Buffer.from(harness().create(entries,{id:'exemplo',micro:'07',
    startedAt:t,endedAt:t+91000,meters:1200,elapsedMs:91000,points:[]})).toString('latin1');
  assert.match(binary,/B001/);assert.match(binary,/B091/);
  const count=Number(binary.match(/\/Type \/Pages \/Kids \[[^\]]+\] \/Count (\d+)/)?.[1]);
  assert.ok(count>=3);
  assert.equal((binary.match(/B0\d\d/g)||[]).length,91);
});
