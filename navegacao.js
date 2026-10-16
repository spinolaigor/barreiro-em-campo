/* Barreiro em Campo — painel recolhido por padrão no celular. */
(function navigationPanel(){
  'use strict';
  function setup(){
    const sidebar=document.getElementById('sidebarRoot');
    const actions=document.querySelector('.topbar .actions');
    const mapArea=document.querySelector('.map-area');
    const findbox=document.querySelector('.sidebar .findbox');
    if(!sidebar||!actions||!mapArea||!findbox)return;
    const mobile=()=>window.matchMedia('(max-width:700px)').matches;
    const el=(tag,className,markup)=>{const n=document.createElement(tag);n.className=className;n.innerHTML=markup;return n};
    const toggle=el('button','action panel-launch','<span aria-hidden="true">☰</span><span>Painel</span>');
    toggle.type='button';toggle.id='panelToggle';
    toggle.setAttribute('aria-controls','sidebarRoot');
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Abrir painel territorial');
    actions.appendChild(toggle);

    const heading=el('div','nav-panel-header','<strong>Painel territorial</strong><button type="button" class="nav-panel-close" id="panelClose" aria-label="Fechar painel">×</button>');
    sidebar.insertBefore(heading,sidebar.firstChild);
    const tools=el('div','nav-tools',
      '<button type="button" id="panelHome">Visão geral</button>'+
      '<button type="button" id="panelLayers">Camadas</button>'+
      '<button type="button" id="panelShare">Compartilhar</button>');
    findbox.insertAdjacentElement('afterend',tools);

    const scrim=el('div','nav-scrim','');
    scrim.id='panelScrim';scrim.hidden=true;mapArea.appendChild(scrim);
    function setOpen(open){
      const active=mobile() && !!open;
      sidebar.classList.toggle('expanded',active);
      sidebar.inert=mobile()&&!active;
      sidebar.setAttribute('aria-hidden',String(mobile()&&!active));
      toggle.setAttribute('aria-expanded',String(active));
      toggle.setAttribute('aria-label',active?'Fechar painel territorial':'Abrir painel territorial');
      scrim.hidden=!active;
      document.documentElement.classList.toggle('nav-panel-open',active);
      if(!active)document.getElementById('search')?.blur();
    }
    function show(){
      if(!mobile())return;
      window.BarreiroLocalizacao?.fechar?.();
      window.BarreiroRondaUI?.fecharPainel?.();
      document.getElementById('layerPanel')?.classList.remove('open');
      document.getElementById('layerButton')?.setAttribute('aria-expanded','false');
      setOpen(true);
    }
    function hide(){setOpen(false)}
    toggle.addEventListener('click',()=>sidebar.classList.contains('expanded')?hide():show());
    document.getElementById('panelClose').addEventListener('click',hide);
    scrim.addEventListener('click',hide);
    document.getElementById('panelHome').addEventListener('click',()=>{
      document.getElementById('goHome')?.click();hide();
    });
    document.getElementById('panelLayers').addEventListener('click',()=>{
      hide();
      window.setTimeout(()=>document.getElementById('layerButton')?.click(),0);
    });
    document.getElementById('panelShare').addEventListener('click',()=>{
      document.getElementById('share')?.click();hide();
    });
    document.getElementById('groupList')?.addEventListener('click',e=>{
      if(e.target.closest('[data-group]'))hide();
    });
    document.getElementById('results')?.addEventListener('click',e=>{
      if(e.target.closest('button'))window.setTimeout(hide,0);
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&sidebar.classList.contains('expanded'))hide();
    });
    window.addEventListener('resize',()=>{
      setOpen(sidebar.classList.contains('expanded'));
    });
    setOpen(false);
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
