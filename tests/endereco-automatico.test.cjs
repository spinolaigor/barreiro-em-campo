const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const env={window:{},Math,Promise};vm.createContext(env);
vm.runInContext(fs.readFileSync('endereco-automatico.js','utf8'),env);
const geocoder=env.window.BarreiroEndereco.__teste;
test('conversão WGS84 para UTM 23S consistente com coordenada medida na micro 07',()=>{
 const xy=geocoder.utm23s(-20.0190817,-44.033925);
 assert.ok(xy[0]>9000&&xy[0]<14000);
 assert.ok(xy[1]>14000&&xy[1]<21000);
});
test('associa número real à via mais próxima sem consultar serviço externo',()=>{
 const lat=-20.0190817,lng=-44.033925,[x,y]=geocoder.utm23s(lat,lng);
 const base={vias:[[123,'RUA FLOR DE PESSEGO',[[x-40,y],[x+40,y]]],
  [456,'RUA TRANSVERSAL',[[x+12,y-30],[x+12,y+30]]]],
 numeros:[[123,55,Math.round(x+5),Math.round(y+8),0],[456,200,Math.round(x+12),Math.round(y+10),0]]};
 const r=geocoder.calcular(base,lat,lng);
 assert.equal(r.logradouro,'RUA FLOR DE PESSEGO');assert.equal(r.numeroAproximado,'55');
 assert.equal(r.fonteReferencia,'CTM/PBH 2026-05-04');
});
test('sem rua próxima não cria número artificial',()=>{
 const base={vias:[[1,'RUA LONGE',[[0,0],[100,0]]]],numeros:[[1,100,30,10,0]]};
 assert.equal(geocoder.calcular(base,-20,-44),null);
});
