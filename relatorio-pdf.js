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
  function create(occurrences,round){
    const entries=(occurrences||[]).slice().sort((a,b)=>a.t-b.t);
    const pageCommands=[];let commands=[],y=0;
    const write=(str,x=LEFT,size=9,bold=false,color='0.12 0.22 0.30')=>{
      commands.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+color+' rg 1 0 0 1 '+
        x+' '+y+' Tm '+literal(str)+' Tj ET');
    };
    const rule=(yy)=>commands.push('0.82 0.87 0.9 RG 0.6 w '+LEFT+' '+yy+' m '+RIGHT+' '+yy+' l S');
    const page=(first)=>{
      if(commands.length)pageCommands.push(commands);
      commands=[];
      y=H-48;
      write('BARREIRO EM CAMPO',LEFT,10,true,'0.07 0.31 0.47');y-=26;
      write('LEVANTAMENTO DE BURACOS',LEFT,18,true);y-=22;
      write('Micro '+safe(round?.micro||'?')+'  |  Ronda: '+short(round?.id||'',32),LEFT,10);
      y-=16;
      write('Inicio: '+stamp(round?.startedAt||Date.now())+
        '  |  Total de ocorrencias: '+entries.length,LEFT,9);
      y-=16;
      rule(y);y-=23;
      if(!first){write('CONTINUACAO DAS OCORRENCIAS',LEFT,11,true);y-=23;}
    };
    function ensure(h){if(y-h<60)page(false);}
    page(true);
    write('RESUMO POR BAIRRO E LOGRADOURO',LEFT,11,true);y-=19;
    const m=new Map();
    for(const p of entries){
      const k=(p.bairro||'Bairro não identificado')+' / '+(p.logradouro||'Via não identificada');
      m.set(k,(m.get(k)||0)+1);
    }
    for(const [name,n] of [...m].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'))){
      ensure(15);
      write(short(name,82),LEFT,8);
      write(String(n),RIGHT-20,8,true);
      y-=15;
    }
    y-=8;ensure(60);
    write('OCORRENCIAS INDIVIDUAIS',LEFT,11,true);y-=20;
    const header=()=>{
      write('ID / Bairro / Rua e referencia',LEFT,9,true);
      write('Coordenadas GPS / Precisao / Data e hora',314,9,true);
      y-=12;rule(y);y-=16;
    };
    header();
    for(const p of entries){
      ensure(48);
      if(y===H-48-26-22-16-16-23-23)header();
      write(short(p.codigo||'?',12)+'  '+short(p.bairro||'Não identificado',42),LEFT,9,true);
      write(short(p.logradouro||'Via não identificada',45)+
        (p.numeroAproximado?'  prox. n. '+short(p.numeroAproximado,12):''),LEFT,8);
      const lat=numeric(p.lat),lng=numeric(p.lng);
      write((lat===null||lng===null?'-':lat.toFixed(6)+', '+lng.toFixed(6)),314,8);
      write('GPS +/- '+safe(Math.round(numeric(p.acc)||0))+' m    '+stamp(p.t),314,8);
      y-=24;rule(y+3);y-=10;
    }
    y-=4;ensure(44);
    write('LOGRADOURO E NUMERO: referencias aproximadas informadas quando disponiveis.',LEFT,8);
    y-=12;
    write('COORDENADAS: posicao estimada pelo GPS. Nao equivale a levantamento topografico.',LEFT,8);
    pageCommands.push(commands);
    const total=pageCommands.length;
    for(let i=0;i<total;i++){
      const c=pageCommands[i];c.push('BT /F1 8 Tf 0.45 0.50 0.58 rg 1 0 0 1 '+LEFT+
        ' 34 Tm '+literal('Barreiro em Campo | Pagina '+(i+1)+' de '+total)+ ' Tj ET');
    }
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