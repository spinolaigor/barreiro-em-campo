/* Barreiro em Campo — geocodificação reversa local (PBH/CTM, mai/2026).
   Marcações e coordenadas não são enviadas à rede. Dados públicos em arquivos fragmentados.
   A referência numérica identifica imóvel próximo, não o imóvel exato diante do buraco. */
(function(){
  'use strict';
  const PATH='./dados/enderecos-barreiro-20260504.json.gz';
  let dados=null,carregando=null;const pendentes=new Set();
  const rad=Math.PI/180;
  function utm23s(lat,lon){
    const a=6378137,e2=0.00669438002290,k0=.9996;
    const p=lat*rad,l=lon*rad,l0=-45*rad,s=Math.sin(p),c=Math.cos(p),t=Math.tan(p);
    const ep2=e2/(1-e2),N=a/Math.sqrt(1-e2*s*s),T=t*t,C=ep2*c*c,A=c*(l-l0);
    const M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*p
      -(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*p)
      +(15*e2**2/256+45*e2**3/1024)*Math.sin(4*p)
      -(35*e2**3/3072)*Math.sin(6*p));
    const x=500000+k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120);
    const y=10000000+k0*(M+N*t*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+
      (61-58*T+T*T+600*C-330*ep2)*A**6/720));
    return [x-590000,y-7770000];
  }
  function distanciaSegmento2(x,y,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy;
    const t=n?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/n)):0;
    const ex=x-a[0]-t*dx,ey=y-a[1]-t*dy;
    return [ex*ex+ey*ey,dx,dy];
  }
  function calcular(base,lat,lng,direcao){
    if(!base?.vias?.length || !base?.numeros?.length)return null;
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    const [x,y]=utm23s(lat,lng),opcoes=new Map();
    const heading=direcao&&Number.isFinite(direcao.dx)&&Number.isFinite(direcao.dy)
      ?Math.hypot(direcao.dx,direcao.dy)>8?direcao:null:null;
    for(const rua of base.vias){
      const [id,nome,coords]=rua;
      for(let i=1;i<coords.length;i++){
        const a=coords[i-1],b=coords[i];
        if(Math.max(a[0],b[0])<x-45||Math.min(a[0],b[0])>x+45||
           Math.max(a[1],b[1])<y-45||Math.min(a[1],b[1])>y+45)continue;
        const [d2,dx,dy]=distanciaSegmento2(x,y,a,b);
        if(d2>1600)continue;
        let orientacao=0;
        if(heading){const z=Math.hypot(dx,dy)*Math.hypot(heading.dx,heading.dy);
          if(z)orientacao=Math.abs((dx*heading.dx+dy*heading.dy)/z);
        }
        const score=Math.sqrt(d2)+(heading?6*(1-orientacao):0);
        const old=opcoes.get(id);
        if(!old||score<old.score)opcoes.set(id,{id,nome,score,d:Math.sqrt(d2)});
      }
    }
    const vias=[...opcoes.values()].sort((a,b)=>a.score-b.score);
    if(!vias.length)return null;
    // Escolhe endereço pertencente à via inferida. A rua mais próxima prevalece,
    // com desempate de direção apenas em cruzamentos.
    const melhores=new Map();
    const candidatas=new Set(vias.slice(0,4).map(v=>v.id));
    const enderecos=base.indiceNumeros
      ? [...candidatas].flatMap(id=>base.indiceNumeros.get(id)||[]) : base.numeros;
    for(const e of enderecos){
      if(!candidatas.has(e[0]))continue;
      const [id,num,ex,ey,qualidade]=e;
      const d=Math.hypot(x-ex,y-ey);
      if(d>85)continue;
      const score=d+(qualidade===2?8:qualidade===1?4:0);
      const old=melhores.get(id);
      if(!old||score<old.score)melhores.set(id,{num,d,qualidade,score});
    }
    const ideal=vias[0];
    let rua=ideal,registro=melhores.get(ideal.id);
    if(!registro){
      for(const outra of vias.slice(1,4)){
        if(outra.d>ideal.d+8)continue;
        const ref=melhores.get(outra.id);
        if(ref){rua=outra;registro=ref;break;}
      }
    }
    if(!registro)return {logradouro:ideal.nome,numeroAproximado:null,
      statusEndereco:'sem-numero',distanciaViaM:Math.round(ideal.d)};
    return {logradouro:rua.nome,numeroAproximado:String(registro.num),
      statusEndereco:registro.d<=35?'referencia-cadastral':'revisar-distancia',
      fonteReferencia:'CTM/PBH 2026-05-04',distanciaEnderecoM:Math.round(registro.d),
      distanciaViaM:Math.round(rua.d)};
  }
  async function preparar(){
    if(dados)return dados;
    if(carregando)return carregando;
    carregando=(async()=>{
      if(typeof fetch!=='function'||typeof DecompressionStream!=='function')throw Error('Navegador sem suporte ao cadastro offline');
      const resposta=await fetch(PATH,{cache:'force-cache'});
      if(!resposta.ok)throw Error('Cadastro offline indisponível');
      const stream=resposta.body || new Blob([await resposta.arrayBuffer()]).stream();
      const base=await new Response(stream.pipeThrough(new DecompressionStream('gzip'))).json();
      if(!Array.isArray(base.vias)||!Array.isArray(base.numeros)||base.numeros.length<1000)
        throw Error('Base cadastral incompleta');
      const indice=new Map();
      for(const e of base.numeros){const a=indice.get(e[0]);if(a)a.push(e);else indice.set(e[0],[e]);}
      Object.defineProperty(base,'indiceNumeros',{value:indice});
      dados=base;return dados;
    })().catch(err=>{carregando=null;throw err;});
    return carregando;
  }
  function buscar(lat,lng,direcao){
    const tarefa=preparar().then(base=>calcular(base,lat,lng,direcao));
    pendentes.add(tarefa);tarefa.then(()=>pendentes.delete(tarefa),()=>pendentes.delete(tarefa));
    return tarefa;
  }
  async function aguardarPendentes(){await Promise.allSettled([...pendentes]);}
  window.BarreiroEndereco={buscar,preparar,aguardarPendentes,
    get pronto(){return !!dados;},
    get vias(){return dados?.vias||[];},
    // funções puras para teste; nenhuma posição do fiscal é exposta ao servidor.
    __teste:{utm23s,calcular,distanciaSegmento2}};
})();
