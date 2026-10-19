/* Barreiro em Campo — Ronda GPS (v1)
 * Elaboracao e organizacao cartografica: Igor Spinola Mello, 2026.
 * Privacidade: dados da ronda armazenados apenas no navegador local.
 */
(() => {
  'use strict';
  const bridge = window.BarreiroBridge;
  if (!bridge || !bridge.DATA || !Array.isArray(bridge.DATA.micros)) return;

  const KEY = 'barreiro.rondas.v1'; // Compatível com rondas salvas anteriormente
  const APP_VERSION = '0.4.5-beta';
  const GPS_FRESH_MS = 30000;
  const GPS_DISPLAY_MAX_ACC = 250;
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
    : geom?.type === 'MultiPolygon' ? geom.coordinates.some(r=>insidePolygon(p,r))
    : geom?.type === 'GeometryCollection' ? (geom.geometries||[]).some(g=>inside(p,g)) : false;
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
      step = 'home', storageOk = true, renderTick = null, outsideShownAt=0,
      loadFailed = false, storedRaw = null, storageMessage = '',
      liveMarker = null, liveAccuracyCircle = null, followLive = true,
      liveCentered = false, liveDragBound = false, markRefreshing = false,
      watchGeneration = 0, gpsStats = {received:0,accepted:0,ignored:0,lastReceivedAt:null,lastResult:'Aguardando GPS',startedAt:0};
  const freshFix = p => !!p && Number.isFinite(p.t) && p.t<=now()+5000 && now()-p.t<=GPS_FRESH_MS;
  function ignored(reason) {gpsStats.ignored++;gpsStats.lastResult=reason;}

  function load() {
    try {
      storedRaw = localStorage.getItem(KEY);
      const v = JSON.parse(storedRaw || '{}');
      if(!v || typeof v!=='object' || (v.v!=null && v.v!==1) ||
        (v.history!=null && !Array.isArray(v.history))) throw new Error('Formato desconhecido');
      const valid = r => r && typeof r.id==='string' && microById.has(String(r.micro)) &&
        Array.isArray(r.points) && Array.isArray(r.visits) &&
        (r.potholes==null || (Array.isArray(r.potholes) && r.potholes.every(p=>p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t)))) &&
        ['recording','paused','finished'].includes(r.status) && Number.isFinite(r.startedAt) &&
        (r.gaps==null || Array.isArray(r.gaps)) &&
        [...r.points,...r.visits].every(p=>p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t));
      if((v.history||[]).some(r=>!valid(r)) || (v.current!=null && !valid(v.current))) throw new Error('Registro inválido');
      history = v.history || [];
      current = v.current || null;
      loadFailed=false; storageOk=true; storageMessage='';
      if(current && current.status === 'recording') {
        // Nunca contar o tempo em que a página esteve fechada como tempo ativo.
        const lastKnown = (current.gaps || []).reduce((last,g)=>Math.max(last,g.t || 0),
          Math.max(current.resumedAt || current.startedAt,current.points.at(-1)?.t || 0,current.visits.at(-1)?.t || 0,(current.potholes||[]).at(-1)?.t || 0));
        const checkpoint = Number.isFinite(current.savedAt) ? current.savedAt : lastKnown;
        current.elapsedMs = Number.isFinite(current.savedElapsedMs) ? current.savedElapsedMs :
          (current.elapsedMs || 0) + Math.max(0,checkpoint-(current.resumedAt || current.startedAt));
        current.status='paused'; current.lastPauseAt=checkpoint; current.resumedAt=null;
        current.segment=(current.segment || 0)+1;
        current.gaps=current.gaps || [];
        const loc=current.lastLocation;
        current.gaps.push({kind:'recuperacao',detail:'Página interrompida; período até a reabertura sem registro confirmado.',
          t:checkpoint,detectedAt:now(),lat:loc?.lat??null,lng:loc?.lng??null});
      }
    } catch(e) {
      history=[]; current=null; loadFailed=true; storageOk=false;
      storageMessage='Não foi possível ler os registros. Eles não foram apagados. Baixe o backup original antes de qualquer recuperação.';
    }
  }
  function storageFailure(message) {
    storageOk=false; storageMessage=message;
    if(current?.status==='recording') {
      current.elapsedMs=elapsed(current);current.status='paused';current.lastPauseAt=now();current.resumedAt=null;
      current.segment=(current.segment || 0)+1;stopWatch();clearLivePosition();gpsState='pausado';
    }
    panelOpen=true;
    if(byId('rondaFab'))drawUI();
    inform(message,'warning');
    return false;
  }
  function persist(nextCurrent=current,nextHistory=history) {
    if(loadFailed)return storageFailure(storageMessage);
    try {
      // Não sobrescrever mudanças de outra aba já observáveis no armazenamento.
      if(localStorage.getItem(KEY)!==storedRaw) return storageFailure(
        'Outra aba alterou os registros. Baixe o backup desta sessão e recarregue antes de continuar.');
      const savedAt=now();
      const savedCurrent=nextCurrent ? {...nextCurrent,savedAt,savedElapsedMs:elapsed(nextCurrent)} : null;
      const raw=JSON.stringify({v:1,current:savedCurrent,history:nextHistory});
      localStorage.setItem(KEY,raw);
      storedRaw=raw;
      if(nextCurrent){nextCurrent.savedAt=savedAt;nextCurrent.savedElapsedMs=savedCurrent.savedElapsedMs;}
      storageOk=true;storageMessage='';
      return true;
    } catch(err) {
      return storageFailure('Não foi possível salvar. A ronda foi pausada. Baixe o backup completo agora e não feche esta página.');
    }
  }
  function download(content,mime,filename) {
    const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function backupAll() {
    // Inclui o que ainda estiver em memória caso o armazenamento esteja cheio.
    const content=loadFailed ? (storedRaw ?? '') : JSON.stringify({
      format:'barreiro-rondas-backup',version:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),
      data:{v:1,current:current ? {...current,savedAt:now(),savedElapsedMs:elapsed(current)} : null,history}
    },null,2);
    download(content,'application/json','Barreiro_Backup_Rondas_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
    if(storageOk)inform('Backup preparado. Confira o arquivo em Downloads/Arquivos e guarde uma cópia em local autorizado.');
  }
  function recordGap(kind, detail, t=now()) {
    if(!current)return;
    if(!Array.isArray(current.gaps))current.gaps=[];
    const prev=current.gaps.at(-1);
    if(prev && prev.kind===kind && t-prev.t<60000)return;
    const loc=current.lastLocation;
    current.gaps.push({kind,detail,t,lat:loc?.lat??null,lng:loc?.lng??null});
    persist();
  }
  function markNewSegment() { if(current) current.segment = (current.segment || 0) + 1; }
  function mapReady() { return !!getMap() && !!window.L; }
  // Ponto azul: GPS atual. Trajeto: apenas as posições aceitas dentro da micro.
  function clearLivePosition() {
    const m=getMap();
    if(m && liveMarker)m.removeLayer(liveMarker);
    if(m && liveAccuracyCircle)m.removeLayer(liveAccuracyCircle);
    liveMarker=null;liveAccuracyCircle=null;liveCentered=false;
  }
  function showLivePosition(p) {
    if(!mapReady() || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) ||
       !Number.isFinite(p.acc) || p.acc<0 || p.acc>GPS_DISPLAY_MAX_ACC || !freshFix(p))return;
    const m=getMap(),ll=[p.lat,p.lng];
    if(!liveDragBound){m.on('dragstart',()=>{followLive=false;});liveDragBound=true;}
    if(!liveAccuracyCircle)
      liveAccuracyCircle=L.circle(ll,{radius:p.acc,color:p.acc<=75?'#147fc7':'#d18b22',weight:1,
        fillColor:'#147fc7',fillOpacity:.12,interactive:false}).addTo(m);
    else{liveAccuracyCircle.setLatLng(ll);liveAccuracyCircle.setRadius(p.acc);
      liveAccuracyCircle.setStyle({color:p.acc<=75?'#147fc7':'#d18b22'});}
    if(!liveMarker)
      liveMarker=L.circleMarker(ll,{radius:9,color:'#fff',weight:3,
        fillColor:'#147fc7',fillOpacity:1,interactive:false}).addTo(m);
    else liveMarker.setLatLng(ll);
    liveMarker.bringToFront();
    if(followLive){
      if(!liveCentered){m.setView(ll,17,{animate:false});liveCentered=true;}
      else if(haversine(p,m.getCenter())>35)m.panTo(ll,{animate:false});
    }
  }
  function followCurrentPosition() {
    followLive=true;liveCentered=false;
    if(!freshFix(lastGps)){
      inform('Aguardando GPS recente para centralizar o mapa.','warning');return;
    }
    showLivePosition(lastGps);panelOpen=false;drawUI();
  }
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
    (current.potholes||[]).forEach((p,i)=>L.circleMarker([p.lat,p.lng],{radius:7,weight:2,color:'#fff',fillColor:'#c34830',fillOpacity:1})
      .bindPopup('<b>Buraco '+esc(p.codigo||'#'+(i+1))+'</b><br>'+esc(p.bairro||'Bairro a identificar')+'<br>'+esc(p.logradouro||'Via a identificar')+'<br>GPS ±'+Math.round(p.acc)+' m').addTo(markerLayer));
    (current.gaps||[]).forEach((g,i)=>{
      if(!Number.isFinite(g.lat)||!Number.isFinite(g.lng))return;
      L.circleMarker([g.lat,g.lng],{radius:6,weight:2,color:'#fff',fillColor:'#d99024',fillOpacity:1})
        .bindPopup(`<b>Interrupção ${i+1}</b><br>${esc(g.detail)}<br>${esc(stamp(g.t))}<br><small>Último ponto GPS válido; não a posição exata da falha.</small>`).addTo(markerLayer);
    });
    if(liveMarker)liveMarker.bringToFront();
  }
  function addPoint(p, fromReplay=false) {
    if(!current) return false;
    const selected = microById.get(current.micro);
    if(!inside(p,selected.geometry)) {
      if(!fromReplay && now()-outsideShownAt>45000) {
        outsideShownAt=now();
        inform('Fora da Micro '+current.micro+'. Esse trecho não será registrado.','warning');
      }
      if(!fromReplay){ignored('Fora da micro: posição exibida, rastro não gravado');current.outside=(current.outside||0)+1;if(!current.outsideActive){recordGap('fora','Saída da Micro '+current.micro,p.t);current.outsideActive=true;}markNewSegment();}
      gpsState='fora'; return false;
    }
    current.outsideActive=false;
    const prev=current.points.at(-1);
    if(prev) {
      const seconds=Math.max(0.001,(p.t-prev.t)/1000), dist=haversine(p,prev);
      if(seconds<2 && dist<7) {gpsState='ok';if(!fromReplay)ignored('Pouco deslocamento: sem novo ponto');return false;}
      // Localizacoes impossiveis sao descartadas, como saltos de GPS.
      if(dist/seconds>40 && dist>65) {gpsState='impreciso';clearLivePosition();if(!fromReplay){ignored('Salto improvável descartado');recordGap('salto','Leitura de GPS com deslocamento improvável',p.t);}markNewSegment();return false;}
      if(seconds>75){if(!fromReplay)recordGap('sem_registro','Intervalo de '+Math.round(seconds)+' s sem pontos válidos',p.t);markNewSegment();}
      if(dist<9 && seconds<20) {gpsState='ok';if(!fromReplay)ignored('Pouco deslocamento: sem novo ponto');return false;}
      if(prev.seg===current.segment && seconds<=75)current.meters=(current.meters||0)+dist;
    }
    const sample={lat:+p.lat.toFixed(7),lng:+p.lng.toFixed(7),acc:Math.round(p.acc),t:p.t,seg:current.segment};
    current.points.push(sample);
    if(current.points.length>12000){pause('A ronda atingiu o limite de pontos. Finalize e exporte antes de iniciar outra.');return false;}
    current.lastLocation=sample;
    gpsState='ok';
    if(!fromReplay){
      gpsStats.accepted++;gpsStats.lastResult='Novo ponto salvo no rastro';
      persist();
      drawTrack();
    }
    return true;
  }
  function acceptGps(position) {
    if(!current || current.status!=='recording')return;
    gpsStats.received++;gpsStats.lastReceivedAt=now();
    const {latitude:lat,longitude:lng,accuracy:acc}=position.coords||{};
    const t=position.timestamp,age=now()-t;
    if(!Number.isFinite(acc) || acc<0 ||
       !Number.isFinite(lat) || Math.abs(lat)>90 || !Number.isFinite(lng) || Math.abs(lng)>180 ||
       !Number.isFinite(t)){
      ignored('Coordenadas ou horário inválidos');gpsState='impreciso';updateStatus();return;
    }
    if(age>GPS_FRESH_MS || age< -5000 || (lastGps && t<lastGps.t) ||
       (current.lastLocation && t<current.lastLocation.t)){
      ignored('Leitura antiga ou fora de ordem descartada');updateStatus();return;
    }
    lastGps={lat,lng,acc,t};
    if(acc<=GPS_DISPLAY_MAX_ACC)showLivePosition(lastGps);
    else clearLivePosition();
    if(acc>75){
      ignored('Precisão ±'+Math.round(acc)+' m: rastro não gravado');gpsState='impreciso';
      if(!current.impreciseActive){
        recordGap('impreciso','Sinal de GPS impreciso',t);
        current.impreciseActive=true;markNewSegment();
      }
      updateStatus();return;
    }
    current.impreciseActive=false;
    addPoint({lat,lng,acc,t});
    updateStatus();
  }
  function gpsError(err) {
    clearLivePosition();
    gpsState = err.code===1 ? 'negado' : 'sem_sinal';
    gpsStats.lastResult=err.code===1?'Permissão negada':'GPS retornou erro '+String(err.code||'desconhecido');
    recordGap(gpsState,err.code===1?'Permissão de localização negada':'Interrupção no sinal do GPS');markNewSegment();
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
    const generation=++watchGeneration;
    gpsState='aguardando';gpsStats.startedAt=now();
    watchId=navigator.geolocation.watchPosition(
      p=>{if(generation===watchGeneration)acceptGps(p)},
      e=>{if(generation===watchGeneration)gpsError(e)},
      {enableHighAccuracy:true,timeout:20000,maximumAge:0});
    screenOn();
  }
  function stopWatch() {
    watchGeneration++;markRefreshing=false;
    if(watchId!==null && navigator.geolocation){navigator.geolocation.clearWatch(watchId);watchId=null;}
    releaseScreen();
  }
  function inform(msg,type='info') {
    const el=byId('rondaMessage'); if(!el)return;
    el.textContent=storageOk ? msg : storageMessage; el.dataset.type=storageOk ? type : 'warning';
  }
  function chooseMicro(micro) {
    if(!microById.has(micro))return;
    byId('rondaMicro').value=micro;
    bridge.selectMicro(micro);
    window.BarreiroNavegacao?.fechar?.();
    byId('detail')?.classList.remove('open');
    byId('sidebarRoot')?.classList.remove('expanded');
  }
  function ensureGPS(){
    if(!window.isSecureContext || !navigator.geolocation){inform('GPS indisponível. Abra o site em HTTPS pelo Chrome ou navegador do celular.','warning');return false}
    return true;
  }
  function start() {
    if(!storageOk){inform(storageMessage,'warning');return;}
    if(!ensureGPS())return;
    const micro=byId('rondaMicro').value;
    if(!microById.has(micro)){inform('Escolha a micro para iniciar.','warning');return}
    if(current && ['paused','recording'].includes(current.status)) {inform('Finalize a ronda atual antes de começar outra.','warning');return;}
    current={id:sid(),micro,status:'recording',startedAt:now(),resumedAt:now(),elapsedMs:0,lastPauseAt:null,
      endedAt:null,points:[],visits:[],potholes:[],potholeSeq:0,gaps:[],meters:0,segment:0,outside:0,lastLocation:null};
    lastGps=null;gpsState='aguardando';followLive=true;clearLivePosition();
    gpsStats={received:0,accepted:0,ignored:0,lastReceivedAt:null,lastResult:'Aguardando GPS',startedAt:now()};
    window.BarreiroLocalizacao?.fechar?.();
    chooseMicro(micro); if(!persist())return; drawTrack();
    startWatch(); panelOpen=false;step='home';drawUI();
    inform('Ronda iniciada! Aguarde o sinal de GPS e mantenha esta página aberta.');
  }
  function pause(reason='Ronda pausada. Toque Retomar para continuar.') {
    if(!current || current.status!=='recording')return;
    current.elapsedMs = elapsed(current);
    current.status='paused';current.lastPauseAt=now();current.resumedAt=null;
    markNewSegment(); stopWatch(); clearLivePosition(); gpsState='pausado';recordGap('pausa',reason);if(storageOk)persist();drawUI();inform(reason,'warning');
  }
  function resume() {
    if(!storageOk){inform(storageMessage,'warning');return;}
    if(!current || current.status!=='paused'||!ensureGPS())return;
    current.status='recording';current.resumedAt=now();current.lastPauseAt=null;
    markNewSegment(); lastGps=null;followLive=true;clearLivePosition();
    gpsStats={received:0,accepted:0,ignored:0,lastReceivedAt:null,lastResult:'Aguardando GPS',startedAt:now()};
    window.BarreiroLocalizacao?.fechar?.();
    if(!persist())return;startWatch();panelOpen=false;drawUI();
    inform('Ronda retomada. Continue com a tela aberta.');
  }
  function finish() {
    if(!current || !['paused','recording'].includes(current.status))return;
    if(!window.confirm('Finalizar esta ronda? O trajeto ficará salvo neste aparelho e poderá ser exportado.'))return;
    const completed={...current,elapsedMs:elapsed(current),status:'finished',endedAt:now(),resumedAt:null};
    const nextHistory=[completed,...history];
    if(!persist(null,nextHistory))return;
    stopWatch();clearLivePosition();history=nextHistory;
    current=null; lastGps=null;gpsState='desligado';removeTrack();
    panelOpen=true;step='history';drawUI();inform('Ronda finalizada e salva neste navegador. Baixe o backup para guardar uma cópia fora dele.');
  }
  function saveVisit(p) {
    if(!current || current.status!=='recording' || !freshFix(p) || p.acc>75 ||
       !inside(p,microById.get(current.micro).geometry)){
      inform('GPS sem posição recente e precisa dentro da micro: vistoria não marcada.','warning');return;
    }
    const visit={lat:p.lat,lng:p.lng,t:now(),acc:p.acc,bairro:bairroAt(p)};
    current.visits.push(visit);if(!persist())return;drawTrack();updateStatus();
    const quick=byId('rondaQuick'); if(quick && !quick.hidden){quick.textContent='✓ Vistoria '+current.visits.length+' marcada';setTimeout(()=>{if(quick)quick.textContent='✓ Marcar vistoria'},1800)}
    inform('Vistoria '+current.visits.length+' marcada em '+visit.bairro+'!');
    if(navigator.vibrate)try{navigator.vibrate(80)}catch(e){}
  }
  function mark() {
    if(!current || current.status!=='recording'){inform('Inicie ou retome a ronda antes de marcar uma vistoria.','warning');return;}
    if(markRefreshing)return;
    if(freshFix(lastGps) && gpsState==='ok')return saveVisit(lastGps);
    if(!navigator.geolocation?.getCurrentPosition){inform('Aguarde uma posição recente para marcar.','warning');return;}
    markRefreshing=true;updateStatus();inform('Atualizando GPS para marcar a vistoria…');
    const sessionId=current.id,generation=watchGeneration;
    navigator.geolocation.getCurrentPosition(position=>{
      if(current?.id!==sessionId || current.status!=='recording' || generation!==watchGeneration)return;
      markRefreshing=false;
      acceptGps(position);
      // Apenas a resposta desta consulta pode autorizar a marcação; não reutilizar o último ponto aceito.
      const c=position.coords||{},p={lat:c.latitude,lng:c.longitude,acc:c.accuracy,t:position.timestamp};
      if(freshFix(p) && p.acc<=75 && lastGps?.t===p.t && gpsState==='ok')saveVisit(p);
      else inform('A nova leitura não foi aceita. Vistoria não marcada.','warning');
      updateStatus();
    },err=>{
      if(current?.id!==sessionId || current.status!=='recording' || generation!==watchGeneration)return;
      markRefreshing=false;gpsError(err);inform('Não foi possível atualizar a posição.','warning');updateStatus();
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }

  function savedPotholes(){
    const all=current?[current,...history]:history;
    return all.map(r=>({id:r.id,micro:r.micro,startedAt:r.startedAt,endedAt:r.endedAt,
      status:r.status,potholes:(r.potholes||[]).map(p=>({...p}))}));
  }
  function savePothole(p){
    if(!storageOk || !current || current.status!=='recording' || !freshFix(p) ||
       !Number.isFinite(p.acc) || p.acc>75 || !inside(p,microById.get(current.micro).geometry))return null;
    const n=(current.potholeSeq||0)+1;
    const point={codigo:'B'+String(n).padStart(3,'0'),lat:+p.lat.toFixed(7),lng:+p.lng.toFixed(7),
      t:now(),acc:Math.round(p.acc),bairro:bairroAt(p),micro:current.micro,
      logradouro:null,numeroAproximado:null};
    const updated={...current,potholeSeq:n,potholes:[...(current.potholes||[]),point]};
    if(!persist(updated))return null;
    current=updated;drawTrack();drawUI();
    if(navigator.vibrate)try{navigator.vibrate(65)}catch(e){}
    return {...point};
  }
  function potholePosition(callback){
    if(!current || current.status!=='recording' || !storageOk){
      callback(null,'Inicie uma ronda com salvamento disponível.');return;
    }
    const accept=pos=>{
      if(!pos || !freshFix(pos) || pos.acc>75 || !inside(pos,microById.get(current.micro).geometry)){
        callback(null,'GPS ainda impreciso, antigo ou fora da micro. Buraco não marcado.');return;
      }
      const point=savePothole(pos);
      callback(point,point?'Buraco '+point.codigo+' registrado.':'Não foi possível salvar o ponto. Confira o backup.');
    };
    if(freshFix(lastGps) && gpsState==='ok'){accept(lastGps);return;}
    if(!navigator.geolocation?.getCurrentPosition){callback(null,'GPS indisponível.');return;}
    const id=current.id,generation=watchGeneration;
    navigator.geolocation.getCurrentPosition(position=>{
      if(current?.id!==id||current.status!=='recording'||generation!==watchGeneration){
        callback(null,'Ronda interrompida: marcação cancelada.');return;
      }
      acceptGps(position);
      const c=position.coords||{};
      const p={lat:c.latitude,lng:c.longitude,acc:c.accuracy,t:position.timestamp};
      if(lastGps?.t!==p.t || gpsState!=='ok'){
        callback(null,'Nova posição não aceita. Buraco não registrado.');return;
      }
      accept(p);
    },()=>{
      callback(null,current?.id!==id||generation!==watchGeneration||current?.status!=='recording'
        ?'Ronda interrompida: marcação cancelada.':'Não foi possível obter uma posição recente.');
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  function atualizarReferenciaAutomatica(roundId,code,ref){
    if(!ref || !ref.logradouro || !storageOk)return false;
    const r=[current,...history].filter(Boolean).find(x=>x.id===roundId);
    const p=(r?.potholes||[]).find(x=>x.codigo===code);
    if(!p || p.referenciaManual || p.logradouro)return false;
    const old={...p};
    p.logradouro=String(ref.logradouro).slice(0,120);
    p.numeroAproximado=ref.numeroAproximado||null;
    p.fonteReferencia=ref.fonteReferencia||'CTM/PBH';
    p.distanciaEnderecoM=ref.distanciaEnderecoM??null;
    p.statusEndereco=ref.statusEndereco||'estimado';
    if(!persist()){Object.assign(p,old);return false;}
    if(r===current)drawTrack();
    return true;
  }
  function editPothole(roundId,code,logradouro,numero){
    const r=([current,...history].filter(Boolean)).find(x=>x.id===roundId);
    const p=(r?.potholes||[]).find(x=>x.codigo===code);
    if(!p || !storageOk)return false;
    const before={logradouro:p.logradouro,numeroAproximado:p.numeroAproximado};
    p.logradouro=String(logradouro||'').trim().slice(0,120)||null;
    p.numeroAproximado=String(numero||'').trim().slice(0,20)||null;
    if(!persist()){Object.assign(p,before);return false;}
    if(r===current)drawTrack();
    return true;
  }
  function undoPothole(){
    if(!current || !current.potholes?.length || !storageOk)return false;
    const updated={...current,potholes:current.potholes.slice(0,-1)};
    if(!persist(updated))return false;
    current=updated;drawTrack();drawUI();return true;
  }
  function name(s){return 'Barreiro_Micro_'+s.micro+'_Ronda_'+new Date(s.startedAt).toISOString().replace(/[:.]/g,'-').slice(0,19)}
  function segments(s){const output=new Map();for(const p of s.points){if(!output.has(p.seg))output.set(p.seg,[]);output.get(p.seg).push(p)}return [...output.values()];}
  function exportFile(s,format) {
    if(!s)return;
    const meta={titulo:'Barreiro em Campo — Ronda',micro:s.micro,inicio:new Date(s.startedAt).toISOString(),fim:s.endedAt?new Date(s.endedAt).toISOString():null,
      versao_aplicativo:APP_VERSION,distancia_estimada_m:Math.round(s.meters||0),total_pontos:s.points.length,total_vistorias:s.visits.length,total_interrupcoes:(s.gaps||[]).length,interrupcoes:s.gaps||[],
      autoria_cartografica:'Igor Spínola Mello (2026)',observacao:'Percurso GPS orientativo, não comprova inspeção integral das vias.'};
    let content='',mime='',ext='';
    if(format==='geojson'){
      const features=[...segments(s).filter(v=>v.length>=2).map((pts,i)=>({type:'Feature',properties:{tipo:'rastro',trecho:i+1,micro:s.micro},geometry:{type:'LineString',coordinates:pts.map(p=>[p.lng,p.lat])}})),
      ...s.visits.map((p,i)=>({type:'Feature',properties:{tipo:'vistoria',numero:i+1,bairro:p.bairro,micro:s.micro,horario:new Date(p.t).toISOString()},geometry:{type:'Point',coordinates:[p.lng,p.lat]}})),
       ...(s.gaps||[]).filter(g=>g.lat!=null&&g.lng!=null).map((g,i)=>({type:'Feature',properties:{tipo:'interrupcao',numero:i+1,causa:g.kind,descricao:g.detail,horario:new Date(g.t).toISOString(),referencia:'último ponto GPS válido'},geometry:{type:'Point',coordinates:[g.lng,g.lat]}}))];
      content=JSON.stringify({type:'FeatureCollection',metadata:meta,features},null,2);ext='geojson';mime='application/geo+json';
    }else if(format==='gpx'){
      const trk=segments(s).map(part=>'<trkseg>'+part.map(p=>`<trkpt lat="${p.lat}" lon="${p.lng}"><time>${new Date(p.t).toISOString()}</time></trkpt>`).join('')+'</trkseg>').join('');
      const wpt=s.visits.map((p,i)=>`<wpt lat="${p.lat}" lon="${p.lng}"><name>Vistoria ${i+1}</name><desc>${esc(p.bairro)}</desc><time>${new Date(p.t).toISOString()}</time></wpt>`).join('')+(s.gaps||[]).filter(g=>g.lat!=null&&g.lng!=null).map((g,i)=>`<wpt lat="${g.lat}" lon="${g.lng}"><name>Interrupção ${i+1}</name><desc>${esc(g.detail+' (último ponto válido)')}</desc><time>${new Date(g.t).toISOString()}</time></wpt>`).join('');
      content=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Barreiro em Campo — Igor Spinola Mello" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Ronda Micro ${s.micro}</name></metadata>${wpt}<trk><name>Ronda Micro ${s.micro}</name>${trk}</trk></gpx>`;
      mime='application/gpx+xml';ext='gpx';
    }else if(format==='csv'){
      const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
      let rows=[['tipo','data_hora','micro','latitude','longitude','precisao_gps_m','bairro','trecho'].join(';')];
      rows.push(...s.points.map(p=>['gps',new Date(p.t).toISOString(),s.micro,p.lat,p.lng,p.acc,'',p.seg].map(q).join(';')));
      rows.push(...s.visits.map(p=>['vistoria',new Date(p.t).toISOString(),s.micro,p.lat,p.lng,p.acc,p.bairro,''].map(q).join(';')));
       rows.push(...(s.gaps||[]).map(g=>['interrupcao',new Date(g.t).toISOString(),s.micro,g.lat??'',g.lng??'','',g.kind+' — '+g.detail,''].map(q).join(';')));
      content='\uFEFF'+rows.join('\r\n');mime='text/csv;charset=utf-8';ext='csv';
    }
    const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name(s)+'.'+ext;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    inform('Arquivo '+ext.toUpperCase()+' preparado para download.');
  }
  function erase(id){
    if(!window.confirm('Apagar esta ronda deste aparelho? Depois de apagar, não será possível recuperar sem um arquivo exportado.'))return;
    const nextHistory=history.filter(s=>s.id!==id);if(!persist(current,nextHistory))return;
    history=nextHistory;drawUI();inform('Registro removido deste navegador.');
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
        <div class="ronda-privacy">🔒 Trajeto salvo apenas neste aparelho. A página precisa ficar aberta.<div class="ronda-version">Versão <strong>v${APP_VERSION}</strong> · <a href="https://github.com/spinolaigor/barreiro-em-campo/blob/main/VERSOES.md" target="_blank" rel="noopener">Ver alterações</a></div></div>
      </section>`;
    document.querySelector('.map-area')?.appendChild(root);
    byId('rondaFab').addEventListener('click',()=>{
      panelOpen=!panelOpen;
      if(panelOpen){window.BarreiroLocalizacao?.fechar?.();byId('sidebarRoot')?.classList.remove('expanded');
        window.BarreiroNavegacao?.fechar?.();byId('layerPanel')?.classList.remove('open');
        byId('layerButton')?.setAttribute('aria-expanded','false');if(!current)step='home';}
      drawUI();
    });
    byId('rondaHide').addEventListener('click',()=>{panelOpen=false;drawUI()});
    byId('rondaQuick').addEventListener('click',mark);
    byId('rondaContent').addEventListener('click',event=>{
      const b=event.target.closest('button[data-ronda]');if(!b)return;
      switch(b.dataset.ronda){
        case 'backup':backupAll();break;
        case 'start':start();break;case 'pause':pause();break;case 'resume':resume();break;
        case 'finish':finish();break;case 'mark':mark();break;
        case 'history':step='history';drawUI();break;
        case 'home':step='home';drawUI();break;
        case 'export':{const s=history.find(x=>x.id===b.dataset.id)|| (current?.id===b.dataset.id?current:null);exportFile(s,b.dataset.format);break;}
        case 'delete':erase(b.dataset.id);break;
        case 'follow':followCurrentPosition();break;
        case 'focus': if(current) {followLive=false;bridge.selectMicro(current.micro);byId('detail')?.classList.remove('open');window.BarreiroNavegacao?.fechar?.();}panelOpen=false;drawUI();break;
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
    quick.disabled=!recording || !storageOk || markRefreshing;
    panel.hidden=!panelOpen;
    if(!panelOpen)return;
    const content=byId('rondaContent');
    if(active){
      content.innerHTML=`<h2 class="ronda-title">${recording?'Ronda em andamento':'Ronda pausada'}</h2>
      <div class="ronda-progress"><span class="ronda-status-dot ${recording?'pulse':'paused'}"></span><span id="rondaGpsStatus">${recording?'Aguardando GPS…':'Pausada'}</span></div>
      <p class="ronda-lastfix" id="rondaLastFix">Aguardando primeira leitura.</p>
      <details class="ronda-diagnostico"><summary>Diagnóstico do GPS</summary><div id="rondaGpsDiagnostics"></div>
        <p>O ponto no mapa pode ser aproximado. Somente pontos aceitos dentro da micro entram no rastro.</p></details>
      <div class="ronda-stats"><div><strong id="rondaDistance">${formatKm(current.meters||0)}</strong><small>trajeto</small></div><div><strong id="rondaTime">${hhmm(elapsed(current))}</strong><small>tempo</small></div><div><strong id="rondaVisits">${current.visits.length}</strong><small>marcações</small></div></div>
       <div class="ronda-gaps"><span id="rondaGapIcon">${(current.gaps||[]).length?'⚠':'✓'}</span> <strong id="rondaGapCount">${(current.gaps||[]).length}</strong> interrupção(ões) ou pausa(s) registrada(s). Pontos laranja mostram o último GPS válido.</div>
      <div class="ronda-actions-stack">${recording?button('mark','✓ Marcar vistoria','primary'):button('resume','▶ Retomar ronda','primary')}
      <div class="ronda-side-by-side">${recording?button('pause','Ⅱ Pausar','muted'):''}${button('finish','■ Finalizar','outline')}</div></div>
      ${recording?button('follow','◎ Centralizar e seguir minha posição','text'):''}
      ${button('focus','↗ Ver minha micro no mapa','text')}
      <p class="ronda-caution">Ponto azul: GPS atual (precisão aproximada). Linha: percurso aceito na Micro ${esc(current.micro)}. Arraste o mapa para explorar; use Centralizar para acompanhar. Passar por uma rua não significa vistoriá-la.</p>`;
    }else if(step==='history'){
      content.innerHTML=`<div class="ronda-row"><h2 class="ronda-title">Rondas salvas</h2>${button('home','← Voltar','text')}</div>
      ${history.length ? history.map(s=>`<article class="ronda-history-entry"><strong>Micro ${esc(s.micro)} · ${esc(stamp(s.startedAt))}</strong><small>${formatKm(s.meters||0)} · ${(s.potholes||[]).length} buraco(s) · ${s.visits.length} vistoria(s) · ${(s.gaps||[]).length} interrupção(ões) · ${hhmm(s.elapsedMs)}</small><details class="ronda-advanced"><summary>Opções técnicas e exclusão</summary><div class="ronda-exports">${button('export','GPX','mini',`data-id="${esc(s.id)}" data-format="gpx"`)}${button('export','GeoJSON','mini',`data-id="${esc(s.id)}" data-format="geojson"`)}${button('export','CSV','mini',`data-id="${esc(s.id)}" data-format="csv"`)}${button('delete','Excluir','mini danger',`data-id="${esc(s.id)}"`)}</div></details></article>`).join('') : '<p class="ronda-empty">Nenhuma ronda concluída neste aparelho.</p>'}
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
    content.insertAdjacentHTML('beforeend',button('backup','↓ Baixar backup completo','outline'));
    if(!storageOk)inform(storageMessage,'warning');
    updateStatus();
  }
  function updateStatus() {
    if(!current)return;
    const age=gpsStats.lastReceivedAt===null ? now()-gpsStats.startedAt : now()-gpsStats.lastReceivedAt;
    const noUpdate=current.status==='recording' && age>GPS_FRESH_MS;
    if(current.status==='recording' && lastGps && !freshFix(lastGps))clearLivePosition();
    const d=byId('rondaDistance'),t=byId('rondaTime'),v=byId('rondaVisits'),status=byId('rondaGpsStatus'),quick=byId('rondaQuick'),gaps=byId('rondaGapCount');
    if(d)d.textContent=formatKm(current.meters||0);
    if(t)t.textContent=hhmm(elapsed(current));
    if(v)v.textContent=String(current.visits.length);
    if(gaps){const n=(current.gaps||[]).length;gaps.textContent=String(n);gaps.closest('.ronda-gaps')?.classList.toggle('clear',n===0);const icon=byId('rondaGapIcon');if(icon)icon.textContent=n?'⚠':'✓';}
    if(quick)quick.disabled=current.status!=='recording'||!storageOk||markRefreshing;
    if(status){
      const texts={aguardando:'Procurando sinal de GPS…',ok:'GPS ativo · ±'+Math.round(lastGps?.acc||0)+' m',impreciso:'GPS impreciso: rastro não atualizado',fora:'Fora da micro — rastro não salvo',sem_sinal:'GPS informou falha na localização',negado:'Permissão do GPS negada',pausado:'Pausada'};
      status.textContent=current.status==='paused'?'Pausada':noUpdate && !['negado','sem_sinal'].includes(gpsState)
        ?'Sem nova leitura GPS há '+Math.floor(age/1000)+' s':(texts[gpsState]||'Procurando sinal…');
      status.closest('.ronda-progress')?.classList.toggle('ronda-sinal-atrasado',noUpdate);
      const fix=byId('rondaLastFix');
      if(fix)fix.textContent=lastGps?'Última posição: '+new Date(lastGps.t).toLocaleTimeString('pt-BR')+
        ' · precisão ±'+Math.round(lastGps.acc)+' m'+(!freshFix(lastGps)?' · desatualizada':''):
        'Nenhuma posição válida nesta etapa.';
      const diag=byId('rondaGpsDiagnostics');
      if(diag)diag.textContent='Leituras recebidas: '+gpsStats.received+' · pontos gravados: '+gpsStats.accepted+
        ' · descartadas ou sem deslocamento: '+gpsStats.ignored+'. Último evento: '+gpsStats.lastResult+'.';
    }
  }
  window.BarreiroRondaUI={
    fecharPainel(){panelOpen=false;drawUI()},
    get ativa(){return current?.status==='recording'},
    mostrarLocalizacao(){followCurrentPosition();panelOpen=true;drawUI();},
    get gravando(){return current?.status==='recording' && storageOk},
    marcarBuraco:potholePosition, listarBuracos:savedPotholes,editarBuraco:editPothole,
    desfazerBuraco:undoPothole
  };
  function startApp(){
    load();buildUI();if(!storageOk)panelOpen=true;drawUI();
    if(current && current.status==='paused'){
      if(storageOk)persist();
      panelOpen=true;drawUI();drawTrack();inform('Ronda recuperada e pausada. Toque Retomar quando estiver pronto.');
    }
    renderTick=setInterval(updateStatus,2500);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden && current?.status==='recording')pause('Ronda pausada porque a página saiu de foco. Volte e toque Retomar.');
    });
    window.addEventListener('beforeunload',e=>{if(current?.status==='recording'){e.preventDefault();e.returnValue='';}});
    window.addEventListener('storage',e=>{if(e.key===KEY || e.key===null) {
      if(current || !storageOk)storageFailure('Outra aba alterou os registros. Baixe o backup desta sessão e recarregue antes de continuar.');
      else {load();drawUI();}
    }});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp,{once:true});
  else startApp();
})();
