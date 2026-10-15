/* Barreiro em Campo — Ronda GPS (v1)
 * Elaboracao e organizacao cartografica: Igor Spinola Mello, 2026.
 * Privacidade: dados da ronda armazenados apenas no navegador local.
 */
(() => {
  'use strict';
  const bridge = window.BarreiroBridge;
  if (!bridge || !bridge.DATA || !Array.isArray(bridge.DATA.micros)) return;

  const KEY = 'barreiro.rondas.v1';
  const COLORS = { navy: '#142c44', blue: '#147baf', green: '#138065' };
  const microById = new Map(bridge.DATA.micros.map(m => [String(m.id), m]));
  const byId = id => document.getElementById(id);
  const formatKm = n => n >= 1000 ? (n / 1000).toFixed(2).replace('.', ',') + ' km' : Math.round(n) + ' m';
  const stamp = t => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const esc = val => String(val ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now = () => Date.now();
  const sid = () => 'ronda-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const getMap = () => bridge.getMap();
  const haversine = (a, b) => {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat/2)**2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.min(1,Math.sqrt(h)));
  };
  const ring = (p, coords) => {
    if (!Array.isArray(coords) || coords.length < 3) return false;
    let inside = false;
    const x = p.lng, y = p.lat;
    for(let i=0,j=coords.length-1; i<coords.length; j=i++) {
      const ax=coords[i][0], ay=coords[i][1], bx=coords[j][0], by=coords[j][1];
      if ((ay > y) !== (by > y) && x < (bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
    }
    return inside;
  };
  const insidePolygon = (p, rings) => rings?.length > 0 && ring(p, rings[0]) && !rings.slice(1).some(hole => ring(p,hole));
  const inside = (p, geom) => geom?.type === 'Polygon'
    ? insidePolygon(p,geom.coordinates)
    : geom?.type === 'MultiPolygon' && geom.coordinates.some(r=>insidePolygon(p,r));
  const bairroAt = p => bridge.DATA.bairros.find(b => inside(p,b.geometry))?.nome || 'Bairro não identificado';
  const elapsed = s => {
    if(!s) return 0;
    const closed = s.status==='recording' ? now() : (s.lastPauseAt || s.endedAt || now());
    return Math.max(0,(s.elapsedMs || 0) + (s.status==='recording' ? closed - (s.resumedAt || s.startedAt) : 0));
  };
  const hhmm = ms => {
    const min = Math.floor(ms / 60000);
    return min >= 60 ? String(Math.floor(min / 60)) + 'h ' + String(min % 60).padStart(2,'0') + 'min' : String(min) + ' min';
  };

  let history = [], current = null, watchId = null, wake = null, lineLayer = null,
      markerLayer = null, lastGps = null, gpsState = 'desligado', panelOpen = false,
      step = 'home', storageOk = true, renderTick = null, outsideShownAt=0;

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '{}');
      history = Array.isArray(v.history) ? v.history.slice(0,15) : [];
      current = v.current && microById.has(String(v.current.micro)) ? v.current : null;
      if(current && current.status === 'recording') {
        // O navegador nao garante rastreamento em segundo plano; exige retomada explicita.
        current.elapsedMs = elapsed(current);
        current.status='paused'; current.lastPauseAt=now(); current.resumedAt=null;
      }
    } catch(e) {history=[]; current=null; storageOk=false;}
  }
  function persist() {
    try {
      const bounded = history.slice(0,15).map(s => ({...s,points:s.points.slice(-4500)}));
      localStorage.setItem(KEY,JSON.stringify({v:1,current,history:bounded}));
      storageOk=true;
    } catch(err) {
      storageOk=false;
      inform('Espaço insuficiente no celular. Exporte a ronda agora para não perder o registro.','warning');
    }
  }
  function markNewSegment() { if(current) current.segment = (current.segment || 0) + 1; }
  function mapReady() { return !!getMap() && !!window.L; }
  function removeTrack() {
    if(!mapReady()) return;
    const map=getMap();
    if(lineLayer) map.removeLayer(lineLayer);
    if(markerLayer) map.removeLayer(markerLayer);
    lineLayer=null; markerLayer=null;
  }
  function drawTrack() {
    if(!mapReady() || !current) return;
    removeTrack();
    const map=getMap();
    lineLayer=L.featureGroup().addTo(map);
    markerLayer=L.featureGroup().addTo(map);
    const segments=new Map();
    current.points.forEach(p => {
      if(!segments.has(p.seg)) segments.set(p.seg,[]);
      segments.get(p.seg).push([p.lat,p.lng]);
    });
    segments.forEach(coords => {
      if(coords.length>1) L.polyline(coords,{color:COLORS.blue,weight:5,opacity:.94,lineCap:'round',lineJoin:'round',interactive:false}).addTo(lineLayer);
      if(coords.length===1) L.circleMarker(coords[0],{color:COLORS.blue,fillColor:COLORS.blue,fillOpacity:1,radius:3,interactive:false}).addTo(lineLayer);
    });
    current.visits.forEach((p,i)=> L.circleMarker([p.lat,p.lng],{radius:7,weight:2,color:'#fff',fillColor:COLORS.green,fillOpacity:1})
      .bindPopup(`<b>Vistoria ${i+1}</b><br>${esc(p.bairro)}<br>${esc(stamp(p.t))}`).addTo(markerLayer));
  }
  function addPoint(p, fromReplay=false) {
    if(!current) return false;
    const selected = microById.get(current.micro);
    if(!inside(p,selected.geometry)) {
      if(!fromReplay && now()-outsideShownAt>45000) {
        outsideShownAt=now();
        inform('Fora da Micro '+current.micro+'. Esse trecho não será registrado.','warning');
      }
      if(!fromReplay){current.outside=(current.outside||0)+1;markNewSegment();}
      gpsState='fora'; return false;
    }
    const prev=current.points.at(-1);
    if(prev) {
      const seconds=Math.max(0.001,(p.t-prev.t)/1000), dist=haversine(p,prev);
      if(seconds<2 && dist<7) return false;
      // Localizacoes impossiveis sao descartadas, como saltos de GPS.
      if(dist/seconds>40 && dist>65) {gpsState='impreciso';return false;}
      if(seconds>75){markNewSegment();}
      if(dist<9 && seconds<20) return false;
      if(prev.seg===current.segment && seconds<=75)current.meters=(current.meters||0)+dist;
    }
    const sample={lat:+p.lat.toFixed(7),lng:+p.lng.toFixed(7),acc:Math.round(p.acc),t:p.t,seg:current.segment};
    current.points.push(sample);
    if(current.points.length>12000){pause('A ronda atingiu o limite de pontos. Finalize e exporte antes de iniciar outra.');return false;}
    current.lastLocation=sample;
    gpsState='ok';
    if(!fromReplay){
      persist();
      drawTrack();
    }
    return true;
  }
  function acceptGps(position) {
    if(!current || current.status!=='recording')return;
    const {latitude:lat,longitude:lng,accuracy:acc}=position.coords;
    lastGps={lat,lng,acc,t:position.timestamp || now()};
    if(!Number.isFinite(acc) || acc>75 || !Number.isFinite(lat) || !Number.isFinite(lng)){
      gpsState='impreciso'; updateStatus(); return;
    }
    addPoint({lat,lng,acc,t:position.timestamp || now()});
    updateStatus();
  }
  function gpsError(err) {
    gpsState = err.code===1 ? 'negado' : 'sem_sinal';
    if(err.code===1){ panelOpen=true; pause('Permissão de localização negada. Ative a localização nas permissões do site e toque Retomar.'); }
    else inform('GPS sem sinal no momento. Continue com a tela aberta.','warning');
    updateStatus();
  }
  async function screenOn() {
    try {
      if('wakeLock' in navigator && document.visibilityState==='visible') {
        wake=await navigator.wakeLock.request('screen');
      }
    }catch(err){ /* wake lock nao garantido em todos aparelhos */ }
  }
  async function releaseScreen(){try{if(wake)await wake.release()}catch(e){}wake=null;}
  function startWatch() {
    if(watchId!==null)navigator.geolocation.clearWatch(watchId);
    gpsState='aguardando';
    watchId=navigator.geolocation.watchPosition(acceptGps,gpsError,{enableHighAccuracy:true,timeout:20000,maximumAge:0});
    screenOn();
  }
  function stopWatch() {
    if(watchId!==null && navigator.geolocation){navigator.geolocation.clearWatch(watchId);watchId=null;}
    releaseScreen();
  }
  function inform(msg,type='info') {
    const el=byId('rondaMessage'); if(!el)return;
    el.textContent=msg; el.dataset.type=type;
  }
  function chooseMicro(micro) {
    if(!microById.has(micro))return;
    byId('rondaMicro').value=micro;
    bridge.selectMicro(micro);
    byId('detail')?.classList.remove('open');
    byId('sidebarRoot')?.classList.remove('expanded');
  }
  function ensureGPS(){
    if(!window.isSecureContext || !navigator.geolocation){inform('GPS indisponível. Abra o site em HTTPS pelo Chrome ou navegador do celular.','warning');return false}
    return true;
  }
  function start() {
    if(!ensureGPS())return;
    const micro=byId('rondaMicro').value;
    if(!microById.has(micro)){inform('Escolha a micro para iniciar.','warning');return}
    if(current && ['paused','recording'].includes(current.status)) {inform('Finalize a ronda atual antes de começar outra.','warning');return;}
    current={id:sid(),micro,status:'recording',startedAt:now(),resumedAt:now(),elapsedMs:0,lastPauseAt:null,
      endedAt:null,points:[],visits:[],meters:0,segment:0,outside:0,lastLocation:null};
    lastGps=null;gpsState='aguardando';
    chooseMicro(micro); persist(); drawTrack();
    startWatch(); panelOpen=false;step='home';drawUI();
    inform('Ronda iniciada! Aguarde o sinal de GPS e mantenha esta página aberta.');
  }
  function pause(reason='Ronda pausada. Toque Retomar para continuar.') {
    if(!current || current.status!=='recording')return;
    current.elapsedMs = elapsed(current);
    current.status='paused';current.lastPauseAt=now();current.resumedAt=null;
    markNewSegment(); stopWatch(); gpsState='pausado';persist();drawUI();inform(reason,'warning');
  }
  function resume() {
    if(!current || current.status!=='paused'||!ensureGPS())return;
    current.status='recording';current.resumedAt=now();current.lastPauseAt=null;
    markNewSegment(); lastGps=null; persist();startWatch();panelOpen=false;drawUI();
    inform('Ronda retomada. Continue com a tela aberta.');
  }
  function finish() {
    if(!current || !['paused','recording'].includes(current.status))return;
    if(!window.confirm('Finalizar esta ronda? O trajeto ficará salvo neste aparelho e poderá ser exportado.'))return;
    if(current.status==='recording')current.elapsedMs=elapsed(current);
    stopWatch();current.status='finished';current.endedAt=now();current.resumedAt=null;
    history.unshift(current);history=history.slice(0,15);
    current=null; lastGps=null;gpsState='desligado';persist();removeTrack();
    panelOpen=true;step='history';drawUI();inform('Ronda finalizada e salva neste aparelho. Você já pode exportá-la.');
  }
  function mark() {
    if(!current || current.status!=='recording'){inform('Inicie ou retome a ronda antes de marcar uma vistoria.','warning');return;}
    const p=current.lastLocation;
    if(!p || now()-p.t>45000){inform('Aguardando uma posição recente e precisa do GPS para marcar.','warning');return;}
    if(!inside(p,microById.get(current.micro).geometry)){inform('Ponto fora da micro: não foi marcado.','warning');return;}
    const visit={lat:p.lat,lng:p.lng,t:now(),acc:p.acc,bairro:bairroAt(p)};
    current.visits.push(visit);persist();drawTrack();updateStatus();\n    const quick=byId('rondaQuick'); if(quick && !quick.hidden){quick.textContent='✓ Vistoria '+current.visits.length+' marcada';setTimeout(()=>{if(quick)quick.textContent='✓ Marcar vistoria'},1800)}
    inform('Vistoria '+current.visits.length+' marcada em '+visit.bairro+'!');
    if(navigator.vibrate)try{navigator.vibrate(80)}catch(e){}
  }
  function name(s){return 'Barreiro_Micro_'+s.micro+'_Ronda_'+new Date(s.startedAt).toISOString().replace(/[:.]/g,'-').slice(0,19)}
  function segments(s){const output=new Map();for(const p of s.points){if(!output.has(p.seg))output.set(p.seg,[]);output.get(p.seg).push(p)}return [...output.values()];}
  function exportFile(s,format) {
    if(!s)return;
    const meta={titulo:'Barreiro em Campo — Ronda',micro:s.micro,inicio:new Date(s.startedAt).toISOString(),fim:s.endedAt?new Date(s.endedAt).toISOString():null,
      distancia_estimada_m:Math.round(s.meters||0),total_pontos:s.points.length,total_vistorias:s.visits.length,
      autoria_cartografica:'Igor Spínola Mello (2026)',observacao:'Percurso GPS orientativo, não comprova inspeção integral das vias.'};
    let content='',mime='',ext='';
    if(format==='geojson'){
      const features=[...segments(s).filter(v=>v.length>=2).map((pts,i)=>({type:'Feature',properties:{tipo:'rastro',trecho:i+1,micro:s.micro},geometry:{type:'LineString',coordinates:pts.map(p=>[p.lng,p.lat])}})),
      ...s.visits.map((p,i)=>({type:'Feature',properties:{tipo:'vistoria',numero:i+1,bairro:p.bairro,micro:s.micro,horario:new Date(p.t).toISOString()},geometry:{type:'Point',coordinates:[p.lng,p.lat]}}))];
      content=JSON.stringify({type:'FeatureCollection',metadata:meta,features},null,2);ext='geojson';mime='application/geo+json';
    }else if(format==='gpx'){
      const trk=segments(s).map(part=>'<trkseg>'+part.map(p=>`<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.t).toISOString()}</time></trkpt>`).join('')+'</trkseg>').join('');
      const wpt=s.visits.map((p,i)=>`<wpt lat="${p.lat}" lon="${p.lng}"><name>Vistoria ${i+1}</name><desc>${esc(p.bairro)}</desc><time>${new Date(p.t).toISOString()}</time></wpt>`).join('');
      content=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Barreiro em Campo — Igor Spinola Mello" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Ronda Micro ${s.micro}</name></metadata>${wpt}<trk><name>Ronda Micro ${s.micro}</name>${trk}</trk></gpx>`;
      mime='application/gpx+xml';ext='gpx';
    }else if(format==='csv'){
      const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
      let rows=[['tipo','data_hora','micro','latitude','longitude','precisao_gps_m','bairro','trecho'].join(';')];
      rows.push(...s.points.map(p=>['gps',new Date(p.t).toISOString(),s.micro,p.lat,p.lng,p.acc,'',p.seg].map(q).join(';')));
      rows.push(...s.visits.map(p=>['vistoria',new Date(p.t).toISOString(),s.micro,p.lat,p.lng,p.acc,p.bairro,''].map(q).join(';')));
      content='\uFEFF'+rows.join('\r\n');mime='text/csv;charset=utf-8';ext='csv';
    }
    const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name(s)+'.'+ext;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    inform('Arquivo '+ext.toUpperCase()+' preparado para download.');
  }
  function erase(id){
    if(!window.confirm('Apagar esta ronda deste aparelho? Depois de apagar, não será possível recuperar sem um arquivo exportado.'))return;
    history=history.filter(s=>s.id!==id);persist();drawUI();inform('Registro removido deste aparelho.');
  }
  function buildUI() {
    const root=document.createElement('div');root.className='ronda-root';root.id='rondaRoot';
    root.innerHTML=`
      <button type="button" id="rondaFab" class="ronda-fab" aria-expanded="false" aria-controls="rondaPanel">
        <span class="ronda-fab-icon" aria-hidden="true">◎</span><span id="rondaFabLabel">Ronda GPS</span>
      </button>
      <button type="button" id="rondaQuick" class="ronda-quick" hidden>✓ Marcar vistoria</button>
      <section id="rondaPanel" class="ronda-panel" role="region" aria-label="Controle da ronda" hidden>
        <div class="ronda-heading"><span class="ronda-kicker">BARREIRO EM CAMPO</span><button type="button" id="rondaHide" aria-label="Fechar painel da ronda" class="ronda-x">×</button></div>
        <div id="rondaContent"></div>
        <p class="ronda-message" id="rondaMessage" role="status" aria-live="polite"></p>
        <div class="ronda-privacy">🔒 Trajeto salvo apenas neste aparelho. A página precisa ficar aberta.</div>
      </section>`;
    document.querySelector('.map-area')?.appendChild(root);
    byId('rondaFab').addEventListener('click',()=>{panelOpen=!panelOpen;if(panelOpen && !current)step='home';drawUI()});
    byId('rondaHide').addEventListener('click',()=>{panelOpen=false;drawUI()});
    byId('rondaQuick').addEventListener('click',mark);
    byId('rondaContent').addEventListener('click',event=>{
      const b=event.target.closest('button[data-ronda]');if(!b)return;
      switch(b.dataset.ronda){
        case 'start':start();break;case 'pause':pause();break;case 'resume':resume();break;
        case 'finish':finish();break;case 'mark':mark();break;
        case 'history':step='history';drawUI();break;
        case 'home':step='home';drawUI();break;
        case 'export':{const s=history.find(x=>x.id===b.dataset.id)|| (current?.id===b.dataset.id?current:null);exportFile(s,b.dataset.format);break;}
        case 'delete':erase(b.dataset.id);break;
        case 'focus': if(current) {bridge.selectMicro(current.micro);byId('detail')?.classList.remove('open');}panelOpen=false;drawUI();break;
      }
    });
    byId('rondaContent').addEventListener('change',e=>{if(e.target.id==='rondaMicro'){chooseMicro(e.target.value)}});
  }
  const button = (action,label,variant='',extras='') => `<button type="button" class="ronda-btn ${variant}" data-ronda="${action}" ${extras}>${label}</button>`;
  function drawUI() {
    const active=!!current && ['paused','recording'].includes(current.status);
    const recording=active && current.status==='recording';
    const fab=byId('rondaFab'),panel=byId('rondaPanel'),quick=byId('rondaQuick');
    if(!fab)return;
    fab.classList.toggle('is-recording',recording);
    fab.classList.toggle('is-paused',active&&!recording);
    byId('rondaFabLabel').textContent=active ? (recording?'● Gravando · Micro '+current.micro:'Ⅱ Pausada · Micro '+current.micro) : 'Ronda GPS';
    fab.setAttribute('aria-expanded',String(panelOpen));
    fab.setAttribute('aria-label',recording?'Ronda em andamento. Abrir controles':active?'Ronda pausada. Abrir controles':'Abrir modo de ronda GPS');
    quick.hidden=!recording || panelOpen;
    quick.disabled=!recording || !current.lastLocation || now()-current.lastLocation.t>45000;
    panel.hidden=!panelOpen;
    if(!panelOpen)return;
    const content=byId('rondaContent');
    if(active){
      content.innerHTML=`<h2 class="ronda-title">${recording?'Ronda em andamento':'Ronda pausada'}</h2>
      <div class="ronda-progress"><span class="ronda-status-dot ${recording?'pulse':'paused'}"></span><span id="rondaGpsStatus">${recording?'Aguardando GPS…':'Pausada'}</span></div>
      <div class="ronda-stats"><div><strong id="rondaDistance">${formatKm(current.meters||0)}</strong><small>trajeto</small></div><div><strong id="rondaTime">${hhmm(elapsed(current))}</strong><small>tempo</small></div><div><strong id="rondaVisits">${current.visits.length}</strong><small>marcações</small></div></div>
      <div class="ronda-actions-stack">${recording?button('mark','✓ Marcar vistoria','primary'):button('resume','▶ Retomar ronda','primary')}
      <div class="ronda-side-by-side">${recording?button('pause','Ⅱ Pausar','muted'):''}${button('finish','■ Finalizar','outline')}</div></div>
      ${button('focus','↗ Ver minha micro no mapa','text')}
      <p class="ronda-caution">Trajeto aproximado dentro da Micro ${esc(current.micro)}. Passar por uma rua não significa vistoriá-la.</p>`;
    }else if(step==='history'){
      content.innerHTML=`<div class="ronda-row"><h2 class="ronda-title">Rondas salvas</h2>${button('home','← Voltar','text')}</div>
      ${history.length ? history.map(s=>`<article class="ronda-history-entry"><strong>Micro ${esc(s.micro)} · ${esc(stamp(s.startedAt))}</strong><small>${formatKm(s.meters||0)} · ${s.visits.length} marcação(ões) · ${hhmm(s.elapsedMs)}</small><div class="ronda-exports">${button('export','GPX','mini',`data-id="${esc(s.id)}" data-format="gpx"`)}${button('export','GeoJSON','mini',`data-id="${esc(s.id)}" data-format="geojson"`)}${button('export','CSV','mini',`data-id="${esc(s.id)}" data-format="csv"`)}${button('delete','Excluir','mini danger',`data-id="${esc(s.id)}"`)}</div></article>`).join('') : '<p class="ronda-empty">Nenhuma ronda concluída neste aparelho.</p>'}
      <p class="ronda-caution">Os registros ficam somente neste navegador. Exporte antes de apagar dados do site ou trocar de celular.</p>`;
    }else{
      const selected=bridge.getSelectedMicro?.();const chosen=microById.has(selected)?selected:'01';
      content.innerHTML=`<h2 class="ronda-title">Pronto para vistoriar?</h2><p class="ronda-help">Escolha sua micro e toque em iniciar. O mapa desenha o trajeto automaticamente.</p>
      <label class="ronda-label" for="rondaMicro">Sua micro</label>
      <select id="rondaMicro" class="ronda-select" aria-label="Escolher micro">${bridge.DATA.micros.map(m=>`<option value="${esc(m.id)}" ${m.id===chosen?'selected':''}>Micro ${esc(m.id)} · ${esc(m.originais)}</option>`).join('')}</select>
      ${button('start','▶ Iniciar ronda','primary')}
      <p class="ronda-caution">Durante a ronda, toque em <strong>Marcar vistoria</strong> quando inspecionar um ponto. Dirigindo? Peça a alguém para operar o celular.</p>
      ${button('history','↗ Ver rondas salvas ('+history.length+')','text')}`;
    }
    updateStatus();
  }
  function updateStatus() {
    if(!current)return;
    const d=byId('rondaDistance'),t=byId('rondaTime'),v=byId('rondaVisits'),status=byId('rondaGpsStatus'),quick=byId('rondaQuick');
    if(d)d.textContent=formatKm(current.meters||0);
    if(t)t.textContent=hhmm(elapsed(current));
    if(v)v.textContent=String(current.visits.length);
    if(quick && current.status==='recording')quick.disabled=!current.lastLocation || now()-current.lastLocation.t>45000;
    if(status){
      const texts={aguardando:'Procurando sinal de GPS…',ok:'GPS ativo · '+Math.round(lastGps?.acc||current.lastLocation?.acc||0)+' m de precisão',impreciso:'GPS impreciso. Aguarde…',fora:'Fora da micro — rastro não salvo',sem_sinal:'Sem sinal de GPS',negado:'Permissão do GPS negada',pausado:'Pausada'};
      status.textContent=current.status==='paused'?'Pausada':(texts[gpsState]||'Procurando sinal…');
    }
  }
  function startApp(){
    load();buildUI();drawUI();
    if(current && current.status==='paused'){
      panelOpen=true;drawUI();drawTrack();inform('Ronda recuperada e pausada. Toque Retomar quando estiver pronto.');
    }
    renderTick=setInterval(updateStatus,2500);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden && current?.status==='recording')pause('Ronda pausada porque a página saiu de foco. Volte e toque Retomar.');
    });
    window.addEventListener('beforeunload',e=>{if(current?.status==='recording'){e.preventDefault();e.returnValue='';}});
    window.addEventListener('storage',e=>{if(e.key===KEY && current?.status!=='recording') {load();drawUI();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp,{once:true});
  else startApp();
})();