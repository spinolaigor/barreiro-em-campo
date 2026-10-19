/* PDF local, sem dependências externas. A4 multipágina, apenas textos e traços.
   Registros reais nunca são enviados ao servidor ou ao GitHub. */
(function(){
  'use strict';
  const W=595,H=842,LEFT=35,RIGHT=560;
  const numeric=v=>Number.isFinite(Number(v))?Number(v):null;
  const safe=v=>String(v??'').replace(/[–—−]/g,'-').replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'").replace(/[^\x20-\x7e\u00a0-\u00ff]/g,'?');
  const short=(v,n)=>{const s=safe(v||'-');return s.length>n?s.slice(0,n-1)+'…'.replace('…','.') : s};
  const literal=v=>'('+safe(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')+')';
  const enc=v=>Uint8Array.from(Array.from(v,c=>{const code=c.charCodeAt(0);return code<=255?code:63}));
  const stamp=t=>new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  // Relatorio independente de imagens de tela ou servicos de mapas externos.
  // Cada entrada corresponde a UM buraco; nunca agrupar/retirar ocorrencias coincidentes.
  function create(occurrences,round){
    const entries=(occurrences||[]).slice().sort((a,b)=>a.t-b.t);
    const pageCommands=[];let commands=[],y=0;
    const fmt=v=>Number(v||0).toFixed(2).replace('.',',');
    const date=t=>t?new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'-';
    const hour=t=>t?new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'-';
    const txt=(str,x,at,size=9,bold=false,color='0.12 0.22 0.30')=>{
      commands.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+color+' rg 1 0 0 1 '+
        x.toFixed(2)+' '+at.toFixed(2)+' Tm '+literal(str)+' Tj ET');
    };
    const line=(x1,y1,x2,y2,c='0.81 0.86 0.90',width=.6)=>{
      commands.push(c+' RG '+width+' w '+x1.toFixed(2)+' '+y1.toFixed(2)+' m '+
        x2.toFixed(2)+' '+y2.toFixed(2)+' l S');
    };
    const rect=(x,by,w,h,fill='1 1 1',stroke=null)=>{
      commands.push(fill+' rg '+x.toFixed(2)+' '+by.toFixed(2)+' '+w.toFixed(2)+' '+
        h.toFixed(2)+' re f');
      if(stroke)commands.push(stroke+' RG .7 w '+x.toFixed(2)+' '+by.toFixed(2)+' '+
        w.toFixed(2)+' '+h.toFixed(2)+' re S');
    };
    const circ=(x,cy,r,fill,outline)=>{
      const z=.55228475*r;
      commands.push(fill+' rg'+(outline?' '+outline+' RG .65 w':'')+' '+
        (x+r).toFixed(2)+' '+cy.toFixed(2)+' m '+
        (x+r).toFixed(2)+' '+(cy+z).toFixed(2)+' '+(x+z).toFixed(2)+' '+(cy+r).toFixed(2)+' '+
        x.toFixed(2)+' '+(cy+r).toFixed(2)+' c '+
        (x-z).toFixed(2)+' '+(cy+r).toFixed(2)+' '+(x-r).toFixed(2)+' '+(cy+z).toFixed(2)+' '+
        (x-r).toFixed(2)+' '+cy.toFixed(2)+' c '+
        (x-r).toFixed(2)+' '+(cy-z).toFixed(2)+' '+(x-z).toFixed(2)+' '+(cy-r).toFixed(2)+' '+
        x.toFixed(2)+' '+(cy-r).toFixed(2)+' c '+
        (x+z).toFixed(2)+' '+(cy-r).toFixed(2)+' '+(x+r).toFixed(2)+' '+(cy-z).toFixed(2)+' '+
        (x+r).toFixed(2)+' '+cy.toFixed(2)+' c h '+(outline?'B':'f'));
    };
    const startPage=()=>{
      if(commands.length)pageCommands.push(commands);
      commands=[];
    };
    const bairros=new Map();
    for(const p of entries){
      const bairro=p.bairro||'Bairro nao identificado';
      bairros.set(bairro,(bairros.get(bairro)||0)+1);
    }
    const porBairro=[...bairros].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pt-BR'));
    const dist=fmt((round?.meters||0)/1000)+' km';
    const dur=round?.elapsedMs||0,mins=Math.floor(dur/60000);
    const tempo=Math.floor(mins/60)+'h '+String(mins%60).padStart(2,'0')+'min';
    const metaLabel='Micro '+(round?.micro||'-')+'  |  '+(round?.id||'Ronda sem ID');
    // Pagina 1: leitura executiva.
    txt('BARREIRO EM CAMPO  /  FISCALIZACAO TERRITORIAL',LEFT,802,9,true,'0.08 0.36 0.52');
    txt('RELATORIO DE EXECUCAO DA RONDA',LEFT,776,17,true);
    txt(metaLabel,LEFT,755,9);
    txt('Inicio: '+date(round?.startedAt)+'    Fim: '+date(round?.endedAt),LEFT,738,9);
    line(LEFT,724,RIGHT,724);
    const cards=[
      ['DISTANCIA GPS',dist],['TEMPO ATIVO',tempo],
      ['BURACOS',String(entries.length)],['BAIRROS',String(porBairro.length)]
    ];
    for(let i=0;i<cards.length;i++){
      const bx=LEFT+i*134;
      rect(bx,656,123,57,'0.95 0.97 0.98','0.85 0.89 0.92');
      txt(cards[i][0],bx+8,691,8,true,'0.33 0.43 0.52');
      txt(cards[i][1],bx+8,668,15,true,'0.08 0.24 0.34');
    }
    txt('MAPA DA MICRO E PERCURSO REALIZADO',LEFT,641,10,true);
    // A geometria desenhada usa a mesma malha territorial presente no aplicativo.
    const g=window.BarreiroBridge?.DATA?.micros?.find(m=>String(m.id)===String(round?.micro))?.geometry;
    const polys=g?.type==='Polygon'?[g.coordinates]:
      g?.type==='MultiPolygon'?g.coordinates:
      g?.type==='GeometryCollection'?(g.geometries||[]).flatMap(o=>
        o.type==='Polygon'?[o.coordinates]:o.type==='MultiPolygon'?o.coordinates:[]):[];
    const utm=window.BarreiroEndereco?.__teste?.utm23s;
    const project=(lat,lng)=>{
      if(typeof utm==='function')return utm(lat,lng);
      return [(lng+44)*104600,(lat+20)*110700];
    };
    const rings=polys.flatMap(p=>p.length?[p[0]]:[]);
    const xyRings=rings.map(r=>r.filter(c=>Number.isFinite(c[0])&&Number.isFinite(c[1]))
      .map(c=>project(c[1],c[0]))).filter(r=>r.length>=3);
    const vertices=xyRings.flat();
    if(!vertices.length){
      for(const p of [...(round?.points||[]),...entries])
        if(Number.isFinite(p.lat)&&Number.isFinite(p.lng))vertices.push(project(p.lat,p.lng));
    }
    const mapX=LEFT,mapY=267,mapW=525,mapH=356;
    rect(mapX,mapY,mapW,mapH,'0.972 0.982 0.987','0.79 0.85 0.90');
    if(vertices.length){
      const xs=vertices.map(v=>v[0]),ys=vertices.map(v=>v[1]);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const scale=Math.min((mapW-36)/Math.max(1,maxX-minX),(mapH-26)/Math.max(1,maxY-minY));
      const xo=mapX+mapW/2-(minX+maxX)*scale/2;
      const yo=mapY+mapH/2-(minY+maxY)*scale/2;
      const mapPt=pt=>[xo+pt[0]*scale,yo+pt[1]*scale];
      const xy=p=>mapPt(project(p.lat,p.lng));
      // Recorte estrito ao quadro.
      commands.push('q '+mapX+' '+mapY+' '+mapW+' '+mapH+' re W n');
      const drawPath=(points,color,width,fill=false)=>{
        if(points.length<2)return;
        const selected=[points[0]];let prev=mapPt(points[0]);
        for(let k=1;k<points.length-1;k++){
          const next=mapPt(points[k]);
          if(Math.hypot(next[0]-prev[0],next[1]-prev[1])>=.95){
            selected.push(points[k]);prev=next;
          }
        }
        selected.push(points.at(-1));
        const first=mapPt(selected[0]);
        let cmd=color+(fill?' rg ':' RG '+width+' w ')+first[0].toFixed(2)+' '+first[1].toFixed(2)+' m';
        for(const p of selected.slice(1)){
          const pt=mapPt(p);
          cmd+=' '+pt[0].toFixed(2)+' '+pt[1].toFixed(2)+' l';
        }
        commands.push(cmd+(fill?' h f':' S'));
      };
      // Vias: contexto cartografico tenue, quando a base compacta PBH ja estiver carregada.
      const malha=window.BarreiroEndereco?.vias||[];
      const margem=120;
      for(const rua of malha){
        const ps=rua[2]||[];
        if(ps.length<2)continue;
        if(!ps.some(p=>p[0]>minX-margem&&p[0]<maxX+margem&&
          p[1]>minY-margem&&p[1]<maxY+margem))continue;
        drawPath(ps,'0.87 0.90 0.92',.52);
      }
      for(const r of xyRings)drawPath(r,'0.85 0.91 0.96',0,true);
      for(const r of xyRings)drawPath(r,'0.35 0.54 0.67',1.3);
      // Segmentar nas pausas: nunca ligar trechos GPS desconectados.
      let seg=null,part=[];
      const push=()=>{if(part.length>1)drawPath(part,'0.08 0.45 0.72',2.1);part=[];};
      for(const p of round?.points||[]){
        if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))continue;
        if(seg!==null&&p.seg!==seg)push();
        seg=p.seg;part.push(project(p.lat,p.lng));
      }
      push();
      // Pontos coincidentes continuam existindo individualmente, com contagem no mapa.
      const marks=new Map();
      for(const p of entries){
        if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))continue;
        const a=xy(p),key=Math.round(a[0]/3)+':'+Math.round(a[1]/3);
        const m=marks.get(key);
        if(m)m.n++;else marks.set(key,{x:a[0],y:a[1],n:1});
      }
      for(const m of marks.values()){
        const r=m.n>1?6:3.6;
        circ(m.x,m.y,r,'0.78 0.21 0.19','1 1 1');
        if(m.n>1)txt(m.n>9?'9+':String(m.n),m.x-(m.n>9?5:2.3),m.y-2.7,7,true,'1 1 1');
      }
      commands.push('Q');
    } else txt('Sem geometria disponivel para o mapa.',mapX+25,mapY+mapH/2,10);
    line(LEFT,250,RIGHT,250,'0.87 0.90 0.92');
    txt('AZUL: trajeto GPS     VERMELHO: buracos (numero = coincidentes)     CONTORNO: limite da micro',
      LEFT,238,7.5,false,'0.27 0.38 0.48');
    txt('BURACOS POR BAIRRO',LEFT,213,10,true);
    if(porBairro.length===0)txt('Nenhum buraco marcado nesta ronda.',LEFT,194,9);
    const cols=porBairro.length>20?3:2,colW=525/cols;
    const colRows=Math.ceil(porBairro.length/cols);
    const maxRows=Math.min(10,colRows);
    for(let i=0;i<porBairro.length&&i<maxRows*cols;i++){
      const col=Math.floor(i/maxRows),row=i%maxRows;
      const bx=LEFT+col*colW,by=193-row*12;
      const maxChars=cols===3?25:34;
      txt(short(porBairro[i][0],maxChars),bx,by,8);
      txt(String(porBairro[i][1]),bx+colW-32,by,8,true);
    }
    txt('Referencia: pontos registrados pelo GPS. Numero de imovel: aproximacao cadastral PBH.',
      LEFT,66,7.5,false,'0.34 0.42 0.48');
    txt('Distancia GPS orientativa; nao comprova vistoria integral das vias.',LEFT,54,7.5,false,'0.34 0.42 0.48');
    // Detalhamento: uma linha por ID, mesmo se dois buracos estiverem no mesmo numero.
    const sorted=entries.slice().sort((a,b)=>
      (a.bairro||'').localeCompare(b.bairro||'','pt-BR')||
      (a.logradouro||'').localeCompare(b.logradouro||'','pt-BR')||
      a.t-b.t);
    const detailPage=()=>{
      startPage();
      txt('BARREIRO EM CAMPO  /  MICRO '+(round?.micro||'-'),LEFT,800,9,true,'0.08 0.36 0.52');
      txt('RELACAO INDIVIDUAL DE BURACOS',LEFT,777,15,true);
      txt('Cada ID corresponde a uma ocorrencia. Enderecos sao referencias aproximadas.',LEFT,760,8);
      line(LEFT,747,RIGHT,747);
      y=726;
    };
    const need=h=>{if(y-h<64)detailPage();};
    detailPage();
    let lastBairro=null,lastVia=null;
    const groups=[];let gb=null,gv=null;
    for(const p of sorted){
      if(p.bairro!==gb){gb=p.bairro;gv=null;groups.push({bairro:gb,vias:[]});}
      if(p.logradouro!==gv){gv=p.logradouro;groups.at(-1).vias.push({logradouro:gv,items:[]});}
      groups.at(-1).vias.at(-1).items.push(p);
    }
    function wordwrap(s,limit){
      const output=[];let lineStr='';
      for(const word of String(s).split(/\s+/)){
        if(lineStr&&lineStr.length+word.length+1>limit){output.push(lineStr);lineStr='';}
        lineStr+=(lineStr?' ':'')+word;
      }
      if(lineStr)output.push(lineStr);
      return output.length?output:['-'];
    }
    for(const group of groups){
      const count=group.vias.reduce((n,r)=>n+r.items.length,0);
      need(58);
      rect(LEFT,y-7,525,24,'0.91 0.95 0.97');
      txt((group.bairro||'Bairro nao identificado')+'   |   '+count+' buraco(s)',LEFT+9,y,10,true);
      y-=35;
      for(const rua of group.vias){
        need(42);
        const title=rua.logradouro||'Via nao identificada';
        const headerLines=wordwrap(title,82);
        for(const h of headerLines){need(14);txt(h,LEFT+8,y,8.7,true,'0.16 0.36 0.48');y-=13;}
        for(const p of rua.items){
          const num=p.numeroAproximado?'Proximo ao n. '+p.numeroAproximado:'Numero nao informado';
          const addr=title+' - '+num;
          const addressLines=wordwrap(addr,81);
          const block=13*addressLines.length+8;
          need(block);
          txt(p.codigo||'?',LEFT+10,y,9,true,'0.72 0.20 0.19');
          txt(hour(p.t),RIGHT-40,y,8,false,'0.37 0.45 0.51');
          for(let k=0;k<addressLines.length;k++){
            txt(addressLines[k],LEFT+68,y-k*12,8.5);
          }
          y-=block;
          line(LEFT+9,y+2,RIGHT-5,y+2,'0.91 0.93 0.95');
          y-=3;
        }
        y-=7;
      }
      y-=10;
    }
    if(!sorted.length)txt('Nenhuma ocorrencia registrada.',LEFT,y,10);
    pageCommands.push(commands);
    const objects=new Map();
    objects.set(1,'<< /Type /Catalog /Pages 2 0 R >>');
    objects.set(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objects.set(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const refs=[];
    pageCommands.forEach((c,i)=>{
      const pid=5+i*2,sid=pid+1;
      refs.push(pid+' 0 R');
      objects.set(pid,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+
        '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+sid+' 0 R >>');
      const bytes=enc(c.join('\n')+'\n');
      objects.set(sid,{data:bytes});
    });
    objects.set(2,'<< /Type /Pages /Kids ['+refs.join(' ')+'] /Count '+total+' >>');
    const chunks=[],offsets=[0];let size=0;
    const add=x=>{const b=typeof x==='string'?enc(x):x;chunks.push(b);size+=b.length;};
    add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const n=4+total*2;
    for(let i=1;i<=n;i++){
      offsets[i]=size;add(i+' 0 obj\n');
      const obj=objects.get(i);if(!obj)throw Error('Objeto PDF ausente: '+i);
      if(typeof obj==='string')add(obj+'\n');
      else{add('<< /Length '+obj.data.length+' >>\nstream\n');add(obj.data);add('\nendstream\n');}
      add('endobj\n');
    }
    const xref=size;
    add('xref\n0 '+(n+1)+'\n0000000000 65535 f \n');
    for(let i=1;i<=n;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    add('trailer\n<< /Size '+(n+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
    const out=new Uint8Array(size);let off=0;
    for(const b of chunks){out.set(b,off);off+=b.length;}
    return out;
  }
  window.BarreiroPDF={create};
})();