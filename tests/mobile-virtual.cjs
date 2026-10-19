/* Ensaio real no Chromium (viewport de celular), com GPS virtual e dados locais isolados.
   Não representa teste físico de sinal de GPS em campo. */
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
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
    const evidenceDir=path.join(base,'tests','_evidencias');
    fs.mkdirSync(evidenceDir,{recursive:true});
    context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
      acceptDownloads:true,permissions:['geolocation'],recordVideo:{dir:evidenceDir,size:{width:390,height:844}}});
    await context.addInitScript(()=>{
      // O envio real exige que o fiscal escolha o destinatário; aqui só capturamos os Files.
      window.__sentReports=[];
      Object.defineProperty(navigator,'canShare',{configurable:true,value:x=>Array.isArray(x.files)&&x.files.length===2});
      Object.defineProperty(navigator,'share',{configurable:true,value:async x=>{window.__sentReports.push(x);}});
    });
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
    await page.screenshot({path:path.join(evidenceDir,'01-ronda-iniciada.png'),fullPage:true});
    await sleep(450);
    await page.locator('#holeQuick').click();
    await wait(()=>page.evaluate(()=>{
      const d=JSON.parse(localStorage.getItem('barreiro.rondas.v1'));
      return d.current.potholes?.length===1;
    }),'marcação do primeiro buraco');
    await page.screenshot({path:path.join(evidenceDir,'02-primeiro-buraco.png'),fullPage:true});
    // Simular deslocamento para outros dois pontos próximos, dentro da mesma micro.
    // O movimento é injetado na API do navegador, e o aplicativo recebe eventos reais de geolocation.
    const positions=await page.evaluate(chosen=>{
      const geom=window.BarreiroBridge.DATA.micros[0].geometry;
      const rings=(geom.type==='MultiPolygon'?geom.coordinates:[geom.coordinates]).map(x=>x[0]);
      const inside=(lat,lon)=>rings.some(ring=>{
        let inside=false;
        for(let i=0,j=ring.length-1;i<ring.length;j=i++){
          const [x,y]=ring[i],[x2,y2]=ring[j];
          if((y>lat)!==(y2>lat)&&lon<(x2-x)*(lat-y)/(y2-y)+x)inside=!inside;
        }return inside;
      });
      const options=[[0.00009,0],[0,0.00009],[-0.00009,0],[0,-0.00009],
        [0.00016,0],[0,0.00016],[-0.00016,0],[0,-0.00016]];
      const found=options.map(([dy,dx])=>({latitude:chosen.latitude+dy,longitude:chosen.longitude+dx,accuracy:8}))
        .filter(p=>inside(p.latitude,p.longitude));
      if(found.length<2)throw Error('Não há pontos próximos dentro da micro para o ensaio');
      return found.slice(0,2);
    },chosen);
    for(let i=0;i<positions.length;i++){
      await sleep(950);
      await context.setGeolocation(positions[i]);
      await sleep(850);
      await page.locator('#holeQuick').click();
      const expected=i+2;
      await wait(()=>page.evaluate(n=>{
        const c=JSON.parse(localStorage.getItem('barreiro.rondas.v1')).current;
        return c.potholes.length===n;
      },expected),'registrar buraco simulado '+expected);
      const last=await page.evaluate(()=>JSON.parse(localStorage.getItem('barreiro.rondas.v1')).current.potholes.at(-1));
      assert.equal(last.codigo,'B'+String(expected).padStart(3,'0'));
      assert.ok(Math.abs(last.lat-positions[i].latitude)<0.00003,'GPS deve apontar ao novo local simulado');
      await page.screenshot({path:path.join(evidenceDir,'0'+(i+3)+'-buraco-'+expected+'.png'),fullPage:true});
    }
    let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('barreiro.rondas.v1')).current);
    assert.equal(saved.potholes[0].codigo,'B001');
    assert.equal(saved.potholes[0].logradouro,null);
    assert.equal(saved.potholes[0].numeroAproximado,null);
    assert.equal(saved.visits.length,0,'buraco não é vistoria genérica');
    assert.equal(saved.potholes[0].micro,'01');
    await page.locator('#rondaFab').click();
    await page.locator('#holeToggle').click();
    await wait(()=>page.locator('#holeContent').getByText('B003',{exact:true}).isVisible(),'listagem de três buracos');
    const dialogs=['Rua de teste','120'];
    page.on('dialog',dialog=>dialog.type()==='prompt'?dialog.accept(dialogs.shift()):dialog.accept());
    await page.locator('[data-hole="edit"]').last().click();
    await wait(()=>page.locator('#holeContent').getByText(/Rua de teste/).isVisible(),'referência editada');
    saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('barreiro.rondas.v1')).current);
    assert.equal(saved.potholes[0].logradouro,'Rua de teste');
    assert.equal(saved.potholes[0].numeroAproximado,'120');
    // Um único toque no botão envia exatamente PDF e CSV para o menu nativo.
    await page.screenshot({path:path.join(evidenceDir,'05-relatorio-unico.png'),fullPage:true});
    assert.equal(await page.locator('#holeContent [data-hole="send"]').count(),1);
    assert.equal(await page.locator('#holeContent [data-hole="csv"]').count(),0);
    assert.equal(await page.locator('#holeContent [data-hole="pdf"]').count(),0);
    await page.locator('[data-hole="send"]').click();
    await wait(()=>page.evaluate(()=>window.__sentReports?.length===1),'compartilhamento simulado');
    const sent=await page.evaluate(async()=>{
      const payload=window.__sentReports[0];
      return Promise.all(payload.files.map(async file=>{
        const bytes=new Uint8Array(await file.arrayBuffer());
        let base64='';for(let i=0;i<bytes.length;i+=1024)
          base64+=String.fromCharCode(...bytes.subarray(i,i+1024));
        return {name:file.name,type:file.type,size:file.size,base64:btoa(base64)};
      }));
    });
    assert.equal(sent.length,2,'devem ser enviados dois arquivos, sem escolher formato');
    assert.match(sent[0].name,/\.pdf$/);
    assert.match(sent[1].name,/\.csv$/);
    for(const item of sent)fs.writeFileSync(path.join(evidenceDir,item.name),Buffer.from(item.base64,'base64'));
    const pdfData=fs.readFileSync(path.join(evidenceDir,sent[0].name));
    const csvContent=fs.readFileSync(path.join(evidenceDir,sent[1].name),'utf8');
    assert.equal(pdfData.subarray(0,4).toString(),'%PDF');
    assert.match(csvContent,/Rua de teste/);
    assert.match(csvContent,/B001/);
    assert.match(csvContent,/B002/);
    assert.match(csvContent,/B003/);
    assert.equal(csvContent.trim().split('\r\n').length,4,'cabeçalho e três buracos');
    // Validar PDF binário com ferramenta de leitura, quando presente na imagem Ubuntu.
    try{
      const pdfText=execFileSync('pdftotext',[path.join(evidenceDir,sent[0].name),'-'],{encoding:'utf8'});
      assert.match(pdfText,/B001/);
      assert.match(pdfText,/B002/);
      assert.match(pdfText,/B003/);
      assert.match(pdfText,/Rua de teste/);
      console.log('PDF lido por pdftotext; três ocorrências e logradouro conferidos.');
    }catch(e){
      if(e.code==='ENOENT')console.log('pdftotext não instalado; PDF validado por estrutura binária.');
      else throw e;
    }
    // Navegador sem compartilhamento de arquivos: um clique produz os DOIS downloads.
    await page.evaluate(()=>Object.defineProperty(navigator,'canShare',
      {configurable:true,value:()=>false}));
    const downloads=[];
    const onDownload=d=>downloads.push(d);
    page.on('download',onDownload);
    await page.locator('[data-hole="send"]').click();
    await wait(()=>Promise.resolve(downloads.length===2),'download duplo sem Web Share');
    page.off('download',onDownload);
    assert.ok(downloads.some(d=>d.suggestedFilename().endsWith('.pdf')));
    assert.ok(downloads.some(d=>d.suggestedFilename().endsWith('.csv')));
    await page.screenshot({path:path.join(evidenceDir,'06-envio-simulado.png'),fullPage:true});
    await page.screenshot({path:'tests/mobile-virtual-painel.png',fullPage:true});
    await page.locator('[data-ronda="pause"]').click();
    assert.equal(await page.locator('#holeQuick').isHidden(),true,'na pausa, não pode marcar buraco');
    await page.locator('[data-ronda="resume"]').click();
    await wait(()=>page.locator('#holeQuick').isVisible(),'botão visível após retomar');
    await page.locator('#rondaFab').click();
    await page.locator('[data-ronda="finish"]').click();
    await wait(()=>page.evaluate(()=>{
      const d=JSON.parse(localStorage.getItem('barreiro.rondas.v1'));
      return d.current===null && d.history[0].potholes.length===3;
    }),'finalização com buraco preservado');
    await page.reload({waitUntil:'domcontentloaded'});
    await wait(()=>page.evaluate(()=>!!window.BarreiroRondaUI?.listarBuracos),'histórico carregado');
    const rows=await page.evaluate(()=>window.BarreiroRondaUI.listarBuracos());
    assert.equal(rows[0].potholes[0].logradouro,'Rua de teste','localStorage preservado ao reabrir');
    assert.equal(rows[0].potholes.length,3,'três ocorrências persistidas');
    await page.screenshot({path:path.join(evidenceDir,'07-historico-reaberto.png'),fullPage:true});
    if(errors.length)throw Error('Erros de script do navegador: '+errors.join(' | '));
    console.log('TESTE VIRTUAL APROVADO — Chromium Android 390x844: 3 buracos distintos, GPS simulado, PDF e CSV lidos, compartilhar dois arquivos em um clique (API de envio simulada), fallback de dois downloads, pausa, retomada, finalização, persistência.');
  }finally{
    const recorded=(await context?.pages())?.[0]?.video?.();
    await context?.close();
    if(recorded){
      const vid=await recorded.path();
      fs.copyFileSync(vid,path.join(base,'tests','_evidencias','ronda-virtual.webm'));
    }
    await browser?.close();
    await new Promise(resolve=>httpServer.close(resolve));
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});