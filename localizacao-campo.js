/* Barreiro em Campo — Onde estou? Consulta de GPS por iniciativa do usuário, sem upload de coordenadas. */
(function campoLocationApp(){
  'use strict';
  const bridge=window.BarreiroBridge;
  if(!bridge || !bridge.DATA || typeof bridge.getMap!=='function')return;
  const $=id=>document.getElementById(id),now=()=>Date.now();
  let watch=null,interval=null,last=null,marker=null,circle=null,opened=false,follow=true,centered=false,count=0;
  const map=()=>bridge.getMap();
  function pointInRing(lat,lng,ring){
    if(!ring || ring.length<3)return false;
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i],[xj,yj]=ring[j];
      if((yi>lat)!==(yj>lat)&&lng<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside;
    }
    return inside;
  }
  function inGeom(lat,lng,shape){
    if(!shape||!shape.coordinates)return false;
    const polygons=shape.type==='Polygon'?[shape.coordinates]:
      shape.type==='MultiPolygon'?shape.coordinates:[];
    return polygons.some(rings=>rings.length&&pointInRing(lat,lng,rings[0])&&
      !rings.slice(1).some(hole=>pointInRing(lat,lng,hole)));
  }
  function territory(lat,lng){
    const micro=bridge.DATA.micros.find(m=>inGeom(lat,lng,m.geometry));
    const bairros=(bridge.DATA.bairros||[]).filter(b=>inGeom(lat,lng,b.geometry));
    const bairro=bairros.find(b=>b.micro===micro?.id)||bairros[0]||null;
    return {micro:micro?.id||null,bairro:bairro?.nome||null};
  }
  function message(txt,warning=false){
    const node=$('whereStatus');
    if(node){node.textContent=txt;node.dataset.warning=warning?'true':'false';}
  }
  function livePosition(p){
    if(!map()||!window.L)return;
    const ll=[p.lat,p.lng],highAccuracy=p.accuracy<=75;
    if(!marker)marker=L.circleMarker(ll,{radius:9,color:'#fff',weight:3,fillColor:'#147fc7',fillOpacity:1,interactive:false}).addTo(map());
    else marker.setLatLng(ll);
    if(!circle)circle=L.circle(ll,{radius:p.accuracy,color:highAccuracy?'#147fc7':'#d18b22',weight:1,fillColor:'#147fc7',fillOpacity:.12,interactive:false}).addTo(map());
    else {circle.setLatLng(ll);circle.setRadius(p.accuracy);circle.setStyle({color:highAccuracy?'#147fc7':'#d18b22'});}
    if(follow){
      if(!centered){map().setView(ll,17,{animate:false});centered=true;}
      else{
        const c=map().getCenter(),metres=Math.hypot((p.lat-c.lat)*111200,(p.lng-c.lng)*111200*Math.cos(p.lat*Math.PI/180));
        if(metres>22)map().panTo(ll,{animate:false});
      }
    }
  }
  function age(){return last?Math.max(0,Math.floor((now()-last.t)/1000)):null;}
  function clock(){
    if(!opened)return;
    if(last){
      $('whereTime').textContent='Atualizado '+new Date(last.t).toLocaleTimeString('pt-BR')+
        ' · precisão ±'+Math.round(last.accuracy)+' m';
      if(age()>35)message('Sem posição nova há '+age()+' s. Confira o GPS do celular.',true);
    }
  }
  function position(pos){
    if(!opened)return;
    count++;
    const c=pos.coords||{},p={lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,t:pos.timestamp||now()};
    if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180||
       !Number.isFinite(p.accuracy)||p.accuracy<0||p.t>now()+5000||now()-p.t>45000){
      message('O GPS enviou uma localização antiga ou inválida. Aguarde.',true);return;
    }
    if(p.accuracy>300){message('GPS muito impreciso (±'+Math.round(p.accuracy)+' m). Aguarde em local aberto.',true);return;}
    last=p;
    const place=territory(p.lat,p.lng);
    $('whereMicro').textContent=place.micro?'Micro '+place.micro:'Fora das dez micros';
    $('whereBairro').textContent=place.bairro||'Bairro não identificado na nossa base';
    $('whereRoad').textContent='Veja o nome da rua no mapa ampliado';
    $('whereMaps').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.lat.toFixed(7)+','+p.lng.toFixed(7));
    $('whereMaps').hidden=false;
    livePosition(p);clock();
    message('Localização atualizada. O ponto azul mostra onde você está.');
  }
  function gpsError(err){
    if(!opened)return;
    const msg=err.code===1?'Permissão do GPS negada. Autorize a localização nas configurações deste site e do celular.':
      err.code===2?'Sem posição de GPS. Ative a localização e experimente um lugar aberto.':
      err.code===3?'GPS demorou para responder. Tente novamente em local aberto.':
      'Falha ao consultar GPS. Confira as permissões.';
    message(msg,true);
  }
  function stop(){
    if(watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watch);
    watch=null;
    if(interval!==null)clearInterval(interval);
    interval=null;
  }
  function close(){
    opened=false;stop();$('wherePanel').hidden=true;
    $('whereFloating').setAttribute('aria-expanded','false');
  }
  function start(){
    if(!opened)return;
    stop();
    if(!window.isSecureContext||!navigator.geolocation){
      message('GPS indisponível. Abra o endereço HTTPS pelo Chrome ou Safari.',true);return;
    }
    last=null;centered=false;follow=true;count=0;
    $('whereFollow').textContent='◎ Acompanhando';
    $('whereFollow').setAttribute('aria-pressed','true');
    $('whereMaps').hidden=true;
    $('whereRoad').textContent='Aguardando GPS para ampliar o mapa';
    $('whereBairro').textContent='Aguardando localização';
    $('whereMicro').textContent='Aguardando GPS';
    $('whereTime').textContent='Procurando sinal GPS…';
    message('Localizando… Permita o acesso à localização quando solicitado.');
    try{
      watch=navigator.geolocation.watchPosition(position,gpsError,{enableHighAccuracy:true,maximumAge:0,timeout:20000});
      interval=setInterval(()=>{if(opened){if(!last&&count===0)message('Procurando posição. Confira se a localização está autorizada.');else clock();}},5000);
    }catch(e){gpsError({code:0});}
  }
  function open(){
    if(!$('wherePanel'))return;
    opened=true;$('wherePanel').hidden=false;
    $('whereFloating').setAttribute('aria-expanded','true');
    start();
  }
  function setup(){
    const host=document.querySelector('.map-area');
    if(!host)return;
    const root=document.createElement('div');
    root.id='whereRoot';root.className='where-root';
    root.innerHTML=`
      <button type="button" id="whereFloating" class="where-floating" aria-expanded="false" aria-controls="wherePanel">◎ Onde estou?</button>
      <section id="wherePanel" class="where-panel" aria-label="Minha localização" role="region" hidden>
        <div class="where-top"><strong>Onde estou agora?</strong><button id="whereClose" type="button" aria-label="Fechar localização">×</button></div>
        <p id="whereStatus" class="where-status" role="status" aria-live="polite">Procurando sua localização…</p>
        <div class="where-info">
          <strong id="whereMicro">Aguardando GPS</strong>
          <span id="whereBairro">Bairro não identificado</span>
          <span id="whereRoad">Nome da rua: consulte no mapa</span>
          <small id="whereTime">Aguardando primeira leitura…</small>
        </div>
        <div class="where-actions">
          <button id="whereFollow" type="button" aria-pressed="true">◎ Acompanhando</button>
          <button id="whereRetry" type="button">↻ Atualizar</button>
        </div>
        <a id="whereMaps" class="where-maps" target="_blank" rel="noopener noreferrer" hidden>↗ Conferir rua no Google Maps</a>
        <p class="where-note">O ponto azul é aproximado. Nomes de rua aparecem no mapa quando cadastrados. Abrir o Google Maps envia a posição ao Google. Esta consulta não grava rondas.</p>
      </section>`;
    host.appendChild(root);
    $('whereFloating').addEventListener('click',open);
    $('whereClose').addEventListener('click',close);
    $('whereRetry').addEventListener('click',start);
    $('whereFollow').addEventListener('click',()=>{
      follow=!follow;centered=false;
      $('whereFollow').textContent=follow?'◎ Acompanhando':'◎ Seguir GPS';
      $('whereFollow').setAttribute('aria-pressed',String(follow));
      if(follow&&last)livePosition(last);
    });
    map()?.on('dragstart',()=>{if(opened&&follow){
      follow=false;centered=false;$('whereFollow').textContent='◎ Seguir GPS';
      $('whereFollow').setAttribute('aria-pressed','false');
    }});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&opened){
      stop();message('Localização pausada. Toque Atualizar quando voltar ao mapa.',true);
    }});
  }
  window.BarreiroLocalizacao={abrir:open,fechar:close,territory,
    get status(){return {opened,count,last,ageSeconds:age()};}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
