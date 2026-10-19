/* Barreiro em Campo — ocorrências de buracos vinculadas às rondas.
   A referência local usa somente cadastro oficial PBH; coordenadas não são enviadas. */
(function potholeUI(){
  'use strict';
  const gps=()=>window.BarreiroRondaUI;
  const byId=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stamp=t=>new Date(t).toLocaleString('pt-BR');
  const rows=()=>((gps()?.listarBuracos?.()||[]).flatMap(r=>
    (r.potholes||[]).map(p=>({...p,ronda:r.id,micro:r.micro,startedAt:r.startedAt}))))
    .sort((a,b)=>a.t-b.t);
  let showPanel=false,loading=false,lastStatus='',lastCount=-1;
  // Relatório de uma única ronda: a ativa ou, após concluir, a mais recente.
  function selectedRound(){
    const first=(gps()?.listarBuracos?.()||[])[0];
    return first?(gps()?.obterRonda?.(first.id)||first):null;
  }
  function reportRows(selected){
    const round=selected||selectedRound();
    return (round?.potholes||[]).map(p=>({...p,ronda:round.id,micro:round.micro,startedAt:round.startedAt}))
      .sort((a,b)=>a.t-b.t);
  }
  function groupRows(list){
    const m=new Map();
    for(const p of list){
      const key=(p.bairro||'Não identificado')+' — '+(p.logradouro||'Via não identificada');
      m.set(key,(m.get(key)||0)+1);
    }
    return [...m].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'));
  }
  function csv(list){
    const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
    const fields=['ronda','codigo','data_hora','micro','bairro','logradouro_referencia','numero_aproximado','latitude','longitude','precisao_gps_m','link_google_maps'];
    return '\uFEFF'+[fields.join(';'),...list.map(p=>[p.ronda,p.codigo,new Date(p.t).toISOString(),
      p.micro,p.bairro,p.logradouro,p.numeroAproximado,p.lat,p.lng,p.acc,
      'https://www.google.com/maps?q='+p.lat+','+p.lng].map(quote).join(';'))].join('\r\n');
  }
  function report(list){
    const grouped=groupRows(list);
    const sums=grouped.map(([road,n])=>'<tr><td>'+esc(road)+'</td><td>'+n+'</td></tr>').join('');
    const details=list.map(p=>'<tr><td>'+esc(p.ronda)+'</td><td>'+esc(p.codigo)+'</td><td>'+
      esc(p.bairro)+'</td><td>'+esc(p.logradouro||'Não identificado')+'</td><td>'+
      esc(p.numeroAproximado||'—')+'</td><td>'+Number(p.lat).toFixed(6)+', '+
      Number(p.lng).toFixed(6)+'</td><td>±'+Math.round(p.acc)+' m</td><td>'+esc(stamp(p.t))+'</td></tr>').join('');
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>Levantamento de buracos</title><style>body{font:13px Arial,sans-serif;margin:25px;color:#1b3348}'+
      'h1{font-size:22px}h2{margin-top:23px;font-size:16px}table{width:100%;border-collapse:collapse;font-size:11px}'+
      'td,th{border:1px solid #cbd5e0;padding:7px;text-align:left}th{background:#edf3f7}button{padding:10px}'+
      'p{line-height:1.5}small{color:#526779}@media print{button{display:none}body{margin:9mm}}</style></head><body>'+
      '<h1>Barreiro em Campo — levantamento de buracos</h1><p><b>'+list.length+
      ' ocorrência(s)</b> · '+grouped.length+' combinação(ões) de bairro e logradouro</p>'+
      '<p><small>Referências de rua e número são aproximadas, quando informadas pelo fiscal. Posições registradas pelo GPS do aparelho.'+
      ' Este documento é um levantamento de campo, não um laudo topográfico.</small></p>'+
      '<button onclick="window.print()">Imprimir / Salvar como PDF</button>'+
      '<h2>Resumo por bairro e via</h2><table><thead><tr><th>Bairro — rua</th><th>Buracos</th></tr></thead><tbody>'+sums+
      '</tbody></table><h2>Ocorrências individuais</h2><table><thead><tr><th>Ronda</th><th>ID</th><th>Bairro</th>'+
      '<th>Logradouro</th><th>Nº aprox.</th><th>GPS</th><th>Precisão</th><th>Horário</th></tr></thead><tbody>'+details+
      '</tbody></table></body></html>';
  }
  function info(msg){
    lastStatus=msg;const el=byId('holeInfo');if(el)el.textContent=msg;
    gps()?.notificar?.(msg);
  }
  function makePair(selected){
    const round=typeof selected==='string'
      ?(gps()?.obterRonda?.(selected)||null):(selected||selectedRound());
    const list=reportRows(round);
    if(!round)return null;
    if(!window.BarreiroPDF?.create)throw Error('Gerador PDF indisponível');
    const tag=new Date(round.startedAt).toISOString().replace(/[:.]/g,'-').slice(0,19)+'_Micro_'+round.micro;
    const filePDF=new File([window.BarreiroPDF.create(list,round)],
      'Barreiro_Buracos_'+tag+'.pdf',{type:'application/pdf'});
    const fileCSV=new File([csv(list)],
      'Barreiro_Buracos_'+tag+'.csv',{type:'text/csv;charset=utf-8'});
    return [filePDF,fileCSV];
  }
  function saveFile(file){
    const url=URL.createObjectURL(file),a=document.createElement('a');
    a.href=url;a.download=file.name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function sendReport(roundId=null){
    const round=roundId?gps()?.obterRonda?.(roundId):selectedRound();
    if(!round){info('Ronda não localizada.');return;}
    const getRows=()=>reportRows(roundId?gps()?.obterRonda?.(roundId):selectedRound());
    const pendentes=getRows().filter(p=>!p.logradouro||!p.numeroAproximado);
    if(pendentes.length){
      info('Identificando rua e número dos '+pendentes.length+' registro(s). Aguarde a consulta local.');
      Promise.resolve(window.BarreiroEnderecosRonda?.completar?.(round.id))
        .then(()=>{
          const faltam=getRows().filter(p=>!p.logradouro||!p.numeroAproximado);
          if(showPanel)renderPanel();
          info(faltam.length?'Existem '+faltam.length+' endereço(s) pendente(s). Corrija nas marcações abaixo antes de compartilhar.':
            'Ruas e números preenchidos. Toque novamente para compartilhar PDF e CSV.');
        }).catch(()=>info('Não foi possível consultar o cadastro. Verifique a conexão e edite a referência.'));
      return;
    }
    let files;
    try{files=makePair(roundId?gps()?.obterRonda?.(roundId):round);}
    catch(e){info('Não foi possível preparar os dois arquivos. Confira o navegador.');return;}
    if(!files){info('Não há ronda selecionada.');return;}
    // A escolha do destinatário permanece com o fiscal. Arquivos locais nunca são enviados sem ação.
    if(navigator.share && navigator.canShare?.({files})){
      info('Escolha o destinatário no compartilhamento do celular.');
      try{
        Promise.resolve(navigator.share({title:'Barreiro em Campo — relatório da ronda',
          text:'Relatório de execução da ronda · Micro '+round.micro,files}))
          .then(()=>info('Compartilhamento concluído no dispositivo.'))
          .catch(err=>{
            if(err?.name==='AbortError'){info('Compartilhamento cancelado.');return;}
            files.forEach(saveFile);
            info('Compartilhamento indisponível; PDF e planilha baixados juntos.');
          });
      }catch(e){
        files.forEach(saveFile);
        info('Compartilhamento indisponível; PDF e planilha baixados juntos.');
      }
    }else{
      // Alternativa sem Web Share API: os DOIS arquivos, sem escolher formato.
      files.forEach(saveFile);
      info('PDF e planilha baixados juntos. Abra Downloads para compartilhar ambos.');
    }
  }
  function renderPanel(){
    const body=byId('holeContent');
    if(!body)return;
    const list=reportRows(),round=selectedRound();
    const groups=groupRows(list);
    const last=list.slice(-10).reverse();
    const faltam=list.filter(p=>(!p.logradouro||!p.numeroAproximado)&&!last.includes(p));
    body.innerHTML='<p><b>'+list.length+' buraco(s) nesta ronda</b> · Micro '+esc(round?.micro||'-')+'.</p>'+
      '<p class="hole-help">Rua e nº aproximado são preenchidos automaticamente com o cadastro PBH. Confira esquinas e corrija se necessário.</p>'+
      '<div class="hole-export-actions"><button type="button" data-hole="send" id="sendHoleReport">'+
      (navigator.share&&navigator.canShare?'Compartilhar relatório':'Baixar relatório completo')+
      ' (PDF + planilha)</button></div>'+
      (last.length?'<strong>Últimas marcações</strong><div class="hole-list">'+last.map(p=>
        '<div class="hole-item"><b>'+esc(p.codigo)+'</b> · '+esc(p.bairro||'Bairro não identificado')+
        '<div>'+esc(p.logradouro||'Via a identificar')+
        (p.numeroAproximado?' · Próx. nº '+esc(p.numeroAproximado):'')+' · GPS ±'+Math.round(p.acc)+' m</div>'+
        '<button type="button" data-hole="edit" data-ronda="'+esc(p.ronda)+'" data-code="'+esc(p.codigo)+'">Editar referência</button></div>').join('')+'</div>':'<p>Nenhuma ocorrência marcada.</p>')+
      (faltam.length?'<strong>Referências pendentes ('+faltam.length+')</strong><div class="hole-list">'+
        faltam.map(p=>'<div class="hole-item"><b>'+esc(p.codigo)+'</b> · '+esc(p.bairro||'')+
        '<div>'+esc(p.logradouro||'Via a identificar')+' · '+esc(p.numeroAproximado||'Nº pendente')+
        '</div><button type="button" data-hole="edit" data-ronda="'+esc(p.ronda)+
        '" data-code="'+esc(p.codigo)+'">Editar referência</button></div>').join('')+'</div>':'')+
      '<p id="holeInfo" role="status" aria-live="polite">'+esc(lastStatus)+'</p>';
  }
  function mark(){
    if(loading || !gps()?.gravando)return;
    loading=true;sync();info('Consultando posição GPS…');
    gps().marcarBuraco((point,msg)=>{
      loading=false;info(msg);
      sync();
      if(point){
        window.dispatchEvent?.(new Event('barreiro:buraco'));
        if(showPanel)renderPanel();
      }
    });
  }
  function sync(){
    const btn=byId('holeQuick'),toggle=byId('holeToggle'),pane=byId('holePanel');
    if(!btn||!toggle||!pane)return;
    const active=!!gps()?.gravando,roundPanelOpen=byId('rondaFab')?.getAttribute('aria-expanded')==='true';
    btn.hidden=!active||roundPanelOpen;
    btn.disabled=!active||loading;
    btn.textContent=loading?'Localizando…':'＋ Buraco';
    const n=reportRows().length;
    toggle.textContent='Buracos ('+n+') '+(showPanel?'▴':'▾');
    pane.hidden=!showPanel;
    if(showPanel && lastCount!==n)renderPanel();
    lastCount=n;
  }
  function setup(){
    const area=document.querySelector('.map-area'),ronda=byId('rondaPanel');
    if(!area||!ronda||!gps()?.marcarBuraco)return;
    const quick=document.createElement('button');
    quick.type='button';quick.id='holeQuick';quick.className='hole-quick';
    quick.textContent='＋ Buraco';quick.hidden=true;quick.addEventListener('click',mark);
    area.appendChild(quick);
    const wrap=document.createElement('div');wrap.className='hole-section';
    wrap.innerHTML='<button type="button" id="holeToggle" class="hole-toggle" aria-controls="holePanel" aria-expanded="false">Buracos (0) ▾</button>'+
      '<div id="holePanel" hidden><div id="holeContent"></div></div>';
    // O acesso ao relatório fica logo no início, acima do histórico e das opções técnicas.
    ronda.insertBefore(wrap,byId('rondaContent'));
    byId('holeToggle').addEventListener('click',()=>{
      showPanel=!showPanel;byId('holeToggle').setAttribute('aria-expanded',String(showPanel));
      if(showPanel)renderPanel();sync();
    });
    byId('holePanel').addEventListener('click',event=>{
      const b=event.target.closest('[data-hole]');
      if(!b)return;
      if(b.dataset.hole==='send')sendReport();
      if(b.dataset.hole==='edit'){
        const list=rows(),p=list.find(x=>x.ronda===b.dataset.ronda&&x.codigo===b.dataset.code);
        if(!p||!window.prompt)return;
        const street=window.prompt('Nome da rua (opcional, aproximado):',p.logradouro||'');
        if(street===null)return;
        const number=window.prompt('Número de referência aproximado (opcional):',p.numeroAproximado||'');
        if(number===null)return;
        const ok=gps().editarBuraco(p.ronda,p.codigo,street,number);
        info(ok?'Referência atualizada.':'Não foi possível salvar a referência.');
        if(ok)renderPanel();
      }
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&showPanel){showPanel=false;sync();}});
    window.addEventListener('barreiro:endereco',()=>{if(showPanel)renderPanel();sync();});
    setInterval(sync,1000);
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
  // Métodos puros para teste, sem acesso aos registros particulares.
  window.BarreiroBuracosFormat={csv,report,groupRows,makePair,reportRows,sendReport};
})();