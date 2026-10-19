const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function pdfHarness(){
  const ctx={window:{},Uint8Array,Date,Math};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('relatorio-pdf.js','utf8'),ctx);
  return ctx.window.BarreiroPDF;
}
test('PDF é documento binário real com uma página e informações das ocorrências',()=>{
  const src=pdfHarness().create([
    {codigo:'B001',t:Date.now(),micro:'01',bairro:'Bairro A',logradouro:'Rua Exemplo',
      numeroAproximado:'120',lat:-20.03,lng:-44.04,acc:9}
  ],{id:'ronda-demo',micro:'01',startedAt:Date.now()});
  const pdf=Buffer.from(src),binary=pdf.toString('latin1');
  assert.equal(pdf.subarray(0,8).toString(),'%PDF-1.4');
  assert.match(binary,/\/Type \/Catalog/);
  assert.match(binary,/\/Pages/);
  assert.match(binary,/\/Count 1 /);
  assert.match(binary,/Rua Exemplo/);
  assert.match(binary,/B001/);
  assert.match(binary,/%%EOF$/);
});
test('PDF com 55 ocorrências distribui tabela por várias páginas',()=>{
  const now=Date.now();
  const points=Array.from({length:55},(_,i)=>({codigo:'B'+String(i+1).padStart(3,'0'),
    t:now+i*1000,bairro:'Bairro Demo',logradouro:'Rua Teste',numeroAproximado:String(100+i),
    lat:-20-i*0.0001,lng:-44,acc:8}));
  const b=Buffer.from(pdfHarness().create(points,{id:'r2',micro:'01',startedAt:now})).toString('latin1');
  const count=Number(b.match(/\/Type \/Pages \/Kids \[[^\]]+\] \/Count (\d+)/)?.[1]);
  assert.ok(count>=2,'relatório deve ter duas ou mais páginas');
  assert.match(b,/B055/);
  assert.match(b,/Pagina 2 de/);
});
test('geração de arquivos usa apenas a última ronda e sempre devolve PDF e CSV',()=>{
  class FakeFile{constructor(data,name,opts){this.data=data;this.name=name;this.type=opts.type;}}
  const ctx={window:{BarreiroRondaUI:{listarBuracos(){return [
    {id:'nova',micro:'01',startedAt:Date.now(),potholes:[{codigo:'B001',t:Date.now(),bairro:'Teste',logradouro:'Rua A',lat:-20,lng:-44,acc:8}]},
    {id:'antiga',micro:'02',startedAt:Date.now()-10000,potholes:[{codigo:'B999',t:Date.now()-10000,bairro:'Outro',logradouro:'Rua Z',lat:-20,lng:-44,acc:8}]}
  ]}},BarreiroPDF:{create(){return Uint8Array.from([37,80,68,70])}}},
    File:FakeFile,Date,Math,document:{readyState:'loading',addEventListener(){}}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('ocorrencias.js','utf8'),ctx);
  const files=ctx.window.BarreiroBuracosFormat.makePair();
  assert.equal(files.length,2);
  assert.match(files[0].name,/\.pdf$/);
  assert.match(files[1].name,/\.csv$/);
  assert.match(files[1].data[0],/B001/);
  assert.doesNotMatch(files[1].data[0],/B999/);
});
