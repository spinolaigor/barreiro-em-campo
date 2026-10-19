const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ui=fs.readFileSync('navegacao.js','utf8');
const css=fs.readFileSync('navegacao.css','utf8');
const html=fs.readFileSync('index.html','utf8');

class Element {
  constructor(){this.listeners={};this.attributes={};this.inert=false;this.hidden=false;this.onclick=0;const state=new Set();
    this.classList={
      toggle:(name,forced)=>{const on=forced===undefined?!state.has(name):!!forced;if(on)state.add(name);else state.delete(name);return on},
      contains:name=>state.has(name),add:name=>state.add(name),remove:name=>state.delete(name)
    };
  }
  addEventListener(name,cb){(this.listeners[name]??=[]).push(cb)}
  emit(name,event={}){for(const cb of this.listeners[name]||[])cb(event)}
  setAttribute(n,v){this.attributes[n]=v}
  getAttribute(n){return this.attributes[n]}
  appendChild(){return this}
  insertBefore(){return this}
  insertAdjacentElement(){return this}
  blur(){this.wasBlurred=true}
  click(){this.onclick++;this.emit('click',{target:this})}
}

function harness(){
  const els=new Map();const id=id=>{if(!els.has(id))els.set(id,new Element());return els.get(id)};
  const selectors=new Map([
    ['.topbar .actions',new Element()],['.map-area',new Element()],
    ['.sidebar .findbox',new Element()]
  ]);
  let mobile=true;
  const register=child=>{
    if(child.id)els.set(child.id,child);
    for(const hit of (child.innerHTML||'').matchAll(/id="([^"]+)"/g))id(hit[1]);
  };
  for(const target of [id('sidebarRoot'),...selectors.values()]){
    for(const method of ['appendChild','insertBefore','insertAdjacentElement'])
      target[method]=function(child){register(child);return this};
  }
  const document={
    readyState:'complete',
    documentElement:new Element(),
    getElementById:id,
    querySelector:q=>selectors.get(q),
    createElement:()=>new Element(),
    addEventListener(){}
  };
  const windowEvents=new Map();
  const window={matchMedia:()=>({matches:mobile}),addEventListener(type,cb){(windowEvents.get(type)||windowEvents.set(type,[]).get(type)).push(cb)},
    setTimeout:fn=>fn(),BarreiroLocalizacao:{fechar(){this.closed=true}},
    BarreiroRondaUI:{fecharPainel(){this.closed=true}}
  };
  const ctx={document,window};
  vm.runInNewContext(ui,ctx);
  return {id,doc:document,window,setMobile:b=>{mobile=b;for(const cb of windowEvents.get('resize')||[])cb()}};
}

test('os arquivos da navegação estão carregados no mapa atual',()=>{
  assert.match(html,/navegacao\.css\?v=/);
  assert.match(html,/navegacao\.js\?v=/);
  assert.match(css,/\.sidebar\.expanded/);
  assert.match(css,/\.map-footer,\.hint\{display:none!important\}/);
});

test('no celular o painel começa recolhido e bloqueia foco na lista oculta',()=>{
  const h=harness();
  assert.equal(h.id('sidebarRoot').classList.contains('expanded'),false);
  assert.equal(h.id('sidebarRoot').inert,true);
  assert.equal(h.id('panelScrim').hidden,true);
  assert.equal(h.id('panelToggle').getAttribute('aria-expanded'),'false');
});

test('botão Painel abre lista e fecha outras consultas de campo',()=>{
  const h=harness();
  h.id('panelToggle').click();
  assert.equal(h.id('sidebarRoot').classList.contains('expanded'),true);
  assert.equal(h.id('sidebarRoot').inert,false);
  assert.equal(h.id('panelScrim').hidden,false);
  assert.equal(h.id('panelToggle').getAttribute('aria-expanded'),'true');
  assert.equal(h.window.BarreiroLocalizacao.closed,true);
  assert.equal(h.window.BarreiroRondaUI.closed,true);
  h.id('panelClose').click();
  assert.equal(h.id('sidebarRoot').inert,true);
  assert.equal(h.id('panelScrim').hidden,true);
});

test('seleção por outra ferramenta fecha também o bloqueio e restaura o mapa',()=>{
  const h=harness();h.id('panelToggle').click();
  h.window.BarreiroNavegacao.fechar();
  assert.equal(h.id('sidebarRoot').classList.contains('expanded'),false);
  assert.equal(h.id('panelScrim').hidden,true);
  assert.equal(h.doc.documentElement.classList.contains('nav-panel-open'),false);
});

test('as funções originais podem ser acessadas sem duplicar lógica',()=>{
  const h=harness();h.id('panelToggle').click();
  h.id('panelHome').click();
  assert.equal(h.id('goHome').onclick,1);
  assert.equal(h.id('sidebarRoot').inert,true);
  h.id('panelToggle').click();
  h.id('panelLayers').click();
  assert.equal(h.id('layerButton').onclick,1);
});

test('fora do celular a navegação lateral continua acessível',()=>{
  const h=harness();h.setMobile(false);h.id('panelToggle').click();
  assert.equal(h.id('sidebarRoot').inert,false);
  assert.equal(h.id('sidebarRoot').getAttribute('aria-hidden'),'false');
});

test('scripts embutidos do mapa e navegação externa têm sintaxe válida',()=>{
  assert.doesNotThrow(()=>new vm.Script(ui));
  const scripts=html.split('<script>').slice(1)
    .map(part=>part.split('</script>')[0]).filter(code=>code.trim());
  assert.equal(scripts.length,2);
  for(const code of scripts)assert.doesNotThrow(()=>new vm.Script(code));
});
