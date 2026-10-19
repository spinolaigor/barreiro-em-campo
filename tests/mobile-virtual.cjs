/* Ensaio real no Chromium (viewport de celular), com GPS virtual e dados locais isolados.
   Não representa teste físico de sinal de GPS em campo. */
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.cwd();
const leafletJs=require.resolve('leaflet/dist/leaflet.js');
const leafletCss=require.resolve('leaflet/dist/leaflet.css');
const sleep=t=>new Promise(ok=>setTimeout(ok,t));
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8',
  '.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8',
  '.geojson':'application/geo+json;charset=utf-8','.png':'image/png'};
function server(){
  return http.createServer((req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      const pathname=decodeURIComponent(url.pathname);
      const candidate=pathname==='/__leaflet.js'?leafletJs:pathname==='/__leaflet.css'?leafletCss:
        path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname));
      if(candidate!==leafletJs&&candidate!==leafletCss && !(candidate===path.join(base,'index.html')||candidate.startsWith(base+path.sep))) {
        res.writeHead(403);res.end();return;
      }
      let content=fs.readFileSync(candidate);
      if(pathname==='/' || pathname==='/index.html') {
        content=Buffer.from(content.toString().replace(
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','/__leaflet.css').replace(
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','/__leaflet.js'));
      }
      res.writeHead(200,{'Content-Type':mime[path.extname(candidate)]||'application/octet-stream',
        'Cache-Control':'no-store'});res.end(content);
    } catch(e){res.writeHead(404);res.end('not found');}
  });
}
async function wait(fn,why,attempts=18){
  for(let i=0;i<attempts;i++){if(await fn())return;await sleep(400)}
  throw new Error('Tempo excedido: '+why);
}
async function main(){
  const httpServer=server();
  await new Promise(resolve=>httpServer.listen(0,'127.0.0.1',resolve));
  const port=httpServer.address().port;
  const errors=[];
  let browser,context;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
      acceptDownloads:true,permissions:['geolocation']});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    // Evita rede de terceiros; a versão do Leaflet é a mesma usada em produção.
    await page.route(/https:\/\/(tile\.openstreetmap\.org|server\.arcgisonline\.com)\//,r=>
      r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOxzK0sAAAAASUVORK5CYII=','base64')}));
    await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});
    await wait(()=>page.evaluate(()=>!!window.L&&!!window.BarreiroRondaUI?.marcarBuraco&&!!window.BarreiroBuracosFormat),
      'Leaflet e extensões carregados');
    assert.equal(await page.locator('#holeQuick').isHidden(),true,'sem ronda, botão buraco fica oculto');
    assert.equal(await page.locator('#panelToggle').isVisible(),true,'controle painel visível');
    await page.locator('#panelToggle').click();
    assert.equal(await page.locator('#sidebarRoot').getAttribute('aria-hidden'),'false');
    await page.locator('#panelClose').click();
    const chosen=await page.evaluate(()=>{
      const selected=window.BarreiroBridge.DATA.micros[0];
      const polygons=selected.geometry.type==='MultiPolygon'?selected.geometry.coordinates:[selected.geometry.coordinates];
      const ring=polygons[0][0];
      // Média dos vértices pode cair fora do polígono; varredura sobre a caixa envolvente.
      const minLon=Math.min(...ring.map(p=>p[0])),maxLon=Math.max(...ring.map(p=>p[0]));
      const minLat=Math.min(...ring.map(p=>p[1])),maxLat=Math.max(...ring.map(p=>p[1]));
      const inside=(lat,lon)=>{
        let yes=false;
        for(let i=0,j=ring.length-1;i<ring.length;j=i++){
          const [x,y]=ring[i],[x2,y2]=ring[j];
          if((y>lat)!==(y2>lat)&&lon<(x2-x)*(lat-y)/(y2-y)+x)yes=!yes;
        }
        return yes;
      };
      for(let y=5;y<40;y++)for(let x=5;x<40;x++){
        const lat=minLat+(maxLat-minLat)*y/45,lon=minLon+(maxLon-minLon)*x/45;
        if(inside(lat,lon))return {latitude:lat,longitude:lon,accuracy:8};
      }
      throw Error('Sem posição de teste dentro da Micro 01');
    });
    await context.setGeolocation(chosen);
    await page.locator('#rondaFab').click();
    await page.locator('#rondaMicro').selectOption('01');
    await page.locator('[data-ronda="start"]').click();
    await wait(()=>page.evaluate(()=>{
      const raw=localStorage.getItem('barreiro.rondas.v1');
      const r=raw&&JSON.parse(raw);
      return r?.current?.status==='recording' && r.current.points.length>=1;
    }),'GPS virtual registrar primeiro ponto');
    await wait(()=>page.locator('#holeQuick').isVisible(),'botão Buraco visível na ronda');
    const hit=await page.locator('#holeQuick').evaluate(el=>{
      const b=el.getBoundingClientRect();
      const owner=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
      return owner===el||el.contains(owner);
    });
    assert.equal(hit,true,'Botão + Buraco precisa receber toques na tela');
    await page.screenshot({path:'tests/mobile-virtual-ronda.png',fullPage:true});
    await page.locator('#holeQuick').click();
    await wait(()=>page.evaluate(()=>{
      const d=JSON.parse(localStorage.getItem('barreiro.rondas.v1'));
      return d.current.potholes?.length===1;
    }),'marcação do primeiro buraco');
    let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('barreiro.rondas.v1')).current);
    assert.equal(saved.potholes[0].codigo,'B001');
    assert.equal(saved.potholes[0].logradouro,null);
    assert.equal(saved.potholes[0].numeroAproximado,null);
    assert.equal(saved.visits.length,0,'buraco não é vistoria genérica');
    assert.equal(saved.potholes[0].micro,'01');
    await page.locator('#rondaFab').click();
    await page.locator('#holeToggle').click();
    await wait(()=>page.locator('#holeContent').getByText('B001').isVisible(),'listagem de buracos');
    const dialogs=['Rua de teste','120'];
    page.on('dialog',dialog=>dialog.type()==='prompt'?dialog.accept(dialogs.shift()):dialog.accept());
    await page.locator('[data-hole="edit"]').first().click();
    await wait(()=>page.locator('#holeContent').getByText(/Rua de teste/).isVisible(),'referência editada');
    saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('barreiro.rondas.v1')).current);
    assert.equal(saved.potholes[0].logradouro,'Rua de teste');
    assert.equal(saved.potholes[0].numeroAproximado,'120');
    const downloadPromise=page.waitForEvent('download',{timeout:10000});
    await page.locator('[data-hole="csv"]').click();
    const download=await downloadPromise;
    assert.match(download.suggestedFilename(),/Barreiro_Buracos_.*\.csv/);
    const csvContent=fs.readFileSync(await download.path(),'utf8');
    assert.match(csvContent,/Rua de teste/);
    assert.match(csvContent,/B001/);
    const popupPromise=page.waitForEvent('popup',{timeout:10000});
    await page.locator('[data-hole="pdf"]').click();
    const popup=await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    assert.match(await popup.locator('body').innerText(),/B001/);
    assert.match(await popup.locator('body').innerText(),/Rua de teste/);
    const pdf=await popup.pdf({format:'A4',printBackground:true});
    assert.equal(pdf.subarray(0,4).toString(),'%PDF');
    await popup.close();
    await page.screenshot({path:'tests/mobile-virtual-painel.png',fullPage:true});
    await page.locator('[data-ronda="pause"]').click();
    assert.equal(await page.locator('#holeQuick').isHidden(),true,'na pausa, não pode marcar buraco');
    await page.locator('[data-ronda="resume"]').click();
    await wait(()=>page.locator('#holeQuick').isVisible(),'botão visível após retomar');
    await page.locator('#rondaFab').click();
    await page.locator('#rondaFab').click();
    await page.locator('[data-ronda="finish"]').click();
    await wait(()=>page.evaluate(()=>{
      const d=JSON.parse(localStorage.getItem('barreiro.rondas.v1'));
      return d.current===null && d.history[0].potholes.length===1;
    }),'finalização com buraco preservado');
    await page.reload({waitUntil:'domcontentloaded'});
    await wait(()=>page.evaluate(()=>!!window.BarreiroRondaUI?.listarBuracos),'histórico carregado');
    const rows=await page.evaluate(()=>window.BarreiroRondaUI.listarBuracos());
    assert.equal(rows[0].potholes[0].logradouro,'Rua de teste','localStorage preservado ao reabrir');
    if(errors.length)throw Error('Erros de script do navegador: '+errors.join(' | '));
    console.log('TESTE VIRTUAL APROVADO — Chromium Android 390x844: mapa, painel, GPS simulado, buraco, endereço opcional, CSV, relatório PDF, pausa, retomada, finalização, persistência.');
  }finally{
    await context?.close();
    await browser?.close();
    await new Promise(resolve=>httpServer.close(resolve));
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});