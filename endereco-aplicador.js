/* Aplica o cadastro espacial local ao histórico de buracos. Sem interferir no botão +Buraco. */
(function(){
  'use strict';
  const analisando=new Map();const semReferencia=new Map();
  function pendentes(ronda){
    const api=window.BarreiroRondaUI;
    const rondas=api?.listarBuracos?.()||[];
    return rondas.filter(r=>!ronda||r.id===ronda).flatMap(r=>(r.potholes||[])
      .filter(p=>!p.logradouro||!p.numeroAproximado).map(p=>({...p,rondaId:r.id})));
  }
  async function processar(p){
    const chave=p.rondaId+':'+p.codigo;
    if(analisando.has(chave))return analisando.get(chave);
    if(Date.now()-(semReferencia.get(chave)||0)<60000)return null;
    const tarefa=window.BarreiroEndereco.buscar(p.lat,p.lng,p.direcao).then(ref=>{
      if(!ref?.logradouro||!ref.numeroAproximado){semReferencia.set(chave,Date.now());return null;}
      const atualizado=window.BarreiroRondaUI.listarBuracos()
        .find(r=>r.id===p.rondaId)?.potholes?.find(x=>x.codigo===p.codigo);
      if(!atualizado)return null;
      if(atualizado.logradouro && atualizado.numeroAproximado)return null;
      // Se o fiscal já indicou a rua, só preencher a numeração se a via coincidir.
      if(atualizado.logradouro && atualizado.logradouro.toUpperCase()!==ref.logradouro.toUpperCase())return null;
      const ok=window.BarreiroRondaUI.editarBuraco(p.rondaId,p.codigo,
        atualizado.logradouro||ref.logradouro,atualizado.numeroAproximado||ref.numeroAproximado,'automatico');
      if(ok && typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('barreiro:endereco',
        {detail:{ronda:p.rondaId,codigo:p.codigo,logradouro:ref.logradouro,numero:ref.numeroAproximado}}));
      return ok?ref:null;
    }).catch(()=>null).finally(()=>analisando.delete(chave));
    analisando.set(chave,tarefa);return tarefa;
  }
  async function completar(ronda){
    if(!window.BarreiroEndereco?.buscar||!window.BarreiroRondaUI?.listarBuracos)return;
    const lista=pendentes(ronda);
    if(!lista.length)return;
    await Promise.allSettled(lista.map(processar));
  }
  let rodando=false;
  function atualizar(){if(rodando || document.hidden)return;rodando=true;
    completar().finally(()=>{rodando=false;});}
  setInterval(atualizar,2500);
  window.addEventListener('barreiro:buraco',atualizar);
  window.addEventListener('visibilitychange',()=>{if(!document.hidden)atualizar();});
  window.BarreiroEnderecosRonda={completar,atualizar};
})();
