(() => {
  'use strict';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const fr=()=>document.documentElement.lang==='fr', tr=(en,french)=>fr()?french:en;
  const paused=()=>document.body.classList.contains('motion-paused');
  const reduce=()=>paused()||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS='http://www.w3.org/2000/svg';
  const data=window.LUC_GRAPH,byId=new Map(data.nodes.map(n=>[n.id,n]));
  const adjacent=new Map(data.nodes.map(n=>[n.id,[]]));
  data.edges.forEach(e=>{adjacent.get(e.a).push({id:e.b,edge:e});adjacent.get(e.b).push({id:e.a,edge:e});});
  const text=n=>n.label[fr()?1:0],desc=n=>n.description[fr()?1:0];
  const graphDialog=$('#network-dialog'),paperDialog=$('#paper-dialog');
  let selected='luc',mode='local',trail=['luc'],hover=null,opener=null,frame=0,running=false,last=0,tick=0,inlineVisible=true;
  const views=[];
  function svg(tag,attrs={}){const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el;}
  function makeView(host,full){
    const root=svg('svg',{role:'group','aria-label':tr('Interactive knowledge graph','Graphe de connaissances interactif')});
    const viewport=svg('g'),links=svg('g',{'class':'kg-links'}),nodes=svg('g',{'class':'kg-nodes'});
    viewport.append(links,nodes);root.append(viewport);host.append(root);
    const view={host,root,viewport,full,links:new Map(),nodes:new Map(),positions:new Map(),visible:new Set(),w:1,h:1,scale:1,zoom:1,pan:{x:0,y:0},drag:null};
    data.edges.forEach((edge,i)=>{
      const group=svg('g',{'class':'kg-connection'}),line=svg('path',{'class':'kg-edge',fill:'none'}),signal=svg('circle',{r:1.5,'class':'kg-signal'}),title=svg('title');
      group.append(line,signal,title);links.append(group);view.links.set(i,{group,line,signal,title,edge});
      line.addEventListener('pointerenter',()=>{hover=selected===edge.a?edge.b:edge.a;paint();});line.addEventListener('pointerleave',()=>{hover=null;paint();});
      line.addEventListener('click',()=>choose(selected===edge.a?edge.b:edge.a));
    });
    data.nodes.forEach((node,index)=>{
      const g=svg('g',{'class':'kg-node kg-'+node.kind,'data-node':node.id,role:'button',tabindex:-1,'aria-pressed':'false'});
      const hit=svg('circle',{r:17,'class':'kg-hit'}),halo=svg('circle',{r:15,'class':'kg-halo'}),dot=svg('circle',{r:5,'class':'kg-dot'}),label=svg('text',{'text-anchor':'middle',y:20,'class':'kg-label'}),title=svg('title');
      g.append(hit,halo,dot,label,title);nodes.append(g);
      view.nodes.set(node.id,{g,dot,halo,label,title});
      const angle=index*2.39996;view.positions.set(node.id,{x:Math.cos(angle)*.75,y:Math.sin(angle)*.75,gx:0,gy:0,vx:0,vy:0,pinned:false});
      let moved=false;
      g.addEventListener('click',()=>{if(moved){moved=false;return;}choose(node.id);});
      g.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(node.id);}
        if(['ArrowRight','ArrowLeft'].includes(e.key)){
          e.preventDefault();const neighbours=adjacent.get(node.id).map(x=>x.id).filter(id=>view.visible.has(id));
          if(neighbours.length)view.nodes.get(neighbours[e.key==='ArrowRight'?0:neighbours.length-1]).g.focus({preventScroll:true});
        }
      });
      g.addEventListener('pointerenter',()=>{hover=node.id;paint();});g.addEventListener('pointerleave',()=>{hover=null;paint();});
      g.addEventListener('focus',()=>{hover=node.id;paint();});g.addEventListener('blur',()=>{hover=null;paint();});
      g.addEventListener('pointerdown',e=>{
        if(!full&&e.pointerType==='touch')return;
        e.stopPropagation();moved=false;view.drag={kind:'node',id:node.id,x:e.clientX,y:e.clientY};g.setPointerCapture(e.pointerId);
      });
      g.addEventListener('pointermove',e=>{
        if(!view.drag||view.drag.id!==node.id)return;
        if(Math.hypot(e.clientX-view.drag.x,e.clientY-view.drag.y)<4&&!moved)return;
        moved=true;const rect=root.getBoundingClientRect(),p=view.positions.get(node.id);
        p.x=(e.clientX-rect.left-view.w/2-view.pan.x)/(view.scale*view.zoom);p.y=(e.clientY-rect.top-view.h/2-view.pan.y)/(view.scale*view.zoom);
        p.pinned=true;p.vx=p.vy=0;paint();
      });
      ['pointerup','pointercancel','lostpointercapture'].forEach(event=>g.addEventListener(event,()=>{view.drag=null;}));
    });
    if(full){
      root.addEventListener('pointerdown',e=>{
        if(e.target.closest('[data-node]'))return;
        view.drag={kind:'pan',x:e.clientX,y:e.clientY,px:view.pan.x,py:view.pan.y};root.setPointerCapture(e.pointerId);
      });
      root.addEventListener('pointermove',e=>{if(view.drag?.kind==='pan'){view.pan.x=view.drag.px+e.clientX-view.drag.x;view.pan.y=view.drag.py+e.clientY-view.drag.y;paint();}});
      ['pointerup','pointercancel','lostpointercapture'].forEach(event=>root.addEventListener(event,()=>{view.drag=null;}));
      root.addEventListener('wheel',e=>{e.preventDefault();view.zoom=Math.max(.5,Math.min(3,view.zoom*Math.exp(-e.deltaY*.0015)));paint();},{passive:false});
    }
    views.push(view);return view;
  }
  const inline=makeView($('#inline-graph'),false),full=makeView($('#full-graph'),true);
  function size(view){
    const rect=view.host.getBoundingClientRect();view.w=Math.max(240,rect.width);view.h=Math.max(190,rect.height);
    view.scale=Math.min((view.w-100)/2,(view.h-75)/2);view.root.setAttribute('viewBox',`0 0 ${view.w} ${view.h}`);
  }
  function labels(view){
    view.nodes.forEach(({g,dot,label,title},id)=>{
      const node=byId.get(id),name=text(node),neighbours=adjacent.get(id).length;
      label.replaceChildren();
      const words=name.split(' '),lines=[''];words.forEach(word=>{const i=lines.length-1;if((lines[i]+' '+word).trim().length>17&&lines[i]&&lines.length<2)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;});
      lines.forEach((line,i)=>{const span=svg('tspan',{x:0,dy:i?'1.15em':'0'});span.textContent=line;label.append(span);});
      title.textContent=name+' · '+neighbours+' '+tr('connections','connexions');
      g.setAttribute('aria-label',title.textContent);dot.setAttribute('r',id==='luc'?8:Math.min(7,3.5+neighbours*.35));
    });
    view.links.forEach(({title,edge})=>{title.textContent=text(byId.get(edge.a))+' — '+edge.label[fr()?1:0]+' — '+text(byId.get(edge.b));});
  }
  function layout(view,snap=false){
    const all=view.full&&mode==='global',neighbours=adjacent.get(selected).map(n=>n.id);
    view.visible=new Set(all?data.nodes.map(n=>n.id):[selected,...neighbours]);
    const grouped={research:0,work:1,skill:2,place:3,profile:4},ordered=data.nodes.filter(n=>n.id!==selected&&view.visible.has(n.id)).sort((a,b)=>grouped[a.kind]-grouped[b.kind]||text(a).localeCompare(text(b)));
    view.positions.forEach(p=>{p.pinned=false;});
    if(all){
      data.nodes.forEach((n,i)=>{
        const angle=i*2.39996,r=.3+.65*Math.sqrt((i+1)/data.nodes.length),p=view.positions.get(n.id);
        p.gx=Math.cos(angle)*r;p.gy=Math.sin(angle)*r;
      });
    }else{
      const centre=view.positions.get(selected);centre.gx=centre.gy=0;
      ordered.forEach((n,i)=>{const angle=-Math.PI/2+i*Math.PI*2/ordered.length,p=view.positions.get(n.id);p.gx=Math.cos(angle)*.85;p.gy=Math.sin(angle)*.85;});
    }
    view.pan={x:0,y:0};view.zoom=1;
    view.nodes.forEach(({g},id)=>{const shown=view.visible.has(id);g.style.display=shown?'':'none';g.setAttribute('tabindex',shown?'0':'-1');});
    view.links.forEach(({group,edge})=>{group.style.display=view.visible.has(edge.a)&&view.visible.has(edge.b)?'':'none';});
    if(snap){view.positions.forEach(p=>{p.x=p.gx;p.y=p.gy;p.vx=p.vy=0;});for(let i=0;i<70;i++)physics(view);}
  }
  function physics(view){
    const list=[...view.visible],scale=view.scale||100;
    list.forEach(id=>{const p=view.positions.get(id);if(!p.pinned){p.vx+=(p.gx-p.x)*.045;p.vy+=(p.gy-p.y)*.045;}});
    for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++){
      const p=view.positions.get(list[a]),q=view.positions.get(list[b]);let dx=p.x-q.x,dy=p.y-q.y;
      const distance=Math.max(.012,dx*dx+dy*dy),force=.00075/distance;
      if(!p.pinned){p.vx+=dx*force;p.vy+=dy*force;}if(!q.pinned){q.vx-=dx*force;q.vy-=dy*force;}
      // Labels receive space as well as the circular nodes.
      const ox=Math.abs(dx)*scale,oy=Math.abs(dy)*scale;
      if(ox<79&&oy<36){const push=(36-oy)/scale*.012,sign=dy>=0?1:-1;if(!p.pinned)p.vy+=sign*push;if(!q.pinned)q.vy-=sign*push;}
    }
    list.forEach(id=>{const p=view.positions.get(id);if(p.pinned)return;p.vx*=.72;p.vy*=.72;p.x+=p.vx;p.y+=p.vy;const mx=(view.w/2-43)/scale,my=(view.h/2-34)/scale;p.x=Math.max(-mx,Math.min(mx,p.x));p.y=Math.max(-my,Math.min(my,p.y));});
  }
  function paintView(view){
    if(view.full&&!graphDialog.open)return;
    view.viewport.setAttribute('transform',`translate(${view.w/2+view.pan.x} ${view.h/2+view.pan.y}) scale(${view.scale*view.zoom})`);
    const neighbours=new Set(adjacent.get(selected).map(x=>x.id)),focus=hover||selected;
    view.nodes.forEach(({g,dot,halo,label},id)=>{
      if(!view.visible.has(id))return;const p=view.positions.get(id),isSelected=id===selected,near=neighbours.has(id);
      g.setAttribute('transform',`translate(${p.x} ${p.y}) scale(${1/(view.scale*view.zoom)})`);
      g.classList.toggle('kg-selected',isSelected);g.classList.toggle('kg-related',near);g.classList.toggle('kg-dim',!near&&!isSelected);g.classList.toggle('kg-hovered',hover===id);g.setAttribute('aria-pressed',String(isSelected));
      halo.setAttribute('r',isSelected?16:12);
    });
    view.links.forEach(({line,signal,edge},i)=>{
      if(!view.visible.has(edge.a)||!view.visible.has(edge.b))return;
      const p=view.positions.get(edge.a),q=view.positions.get(edge.b),near=edge.a===focus||edge.b===focus;
      const bend=.025*(i%2?1:-1),cx=(p.x+q.x)/2+bend,cy=(p.y+q.y)/2-bend;
      line.setAttribute('d',`M${p.x},${p.y} Q${cx},${cy} ${q.x},${q.y}`);line.setAttribute('vector-effect','non-scaling-stroke');line.classList.toggle('kg-connected',near);
      signal.style.display=reduce()||!near?'none':'';
      if(!reduce()&&near){const t=(tick*.18+i*.137)%1,inv=1-t;signal.setAttribute('cx',inv*inv*p.x+2*inv*t*cx+t*t*q.x);signal.setAttribute('cy',inv*inv*p.y+2*inv*t*cy+t*t*q.y);signal.setAttribute('r',1.6/(view.scale*view.zoom));}
    });
  }
  function paint(){views.forEach(paintView);}
  function panel(){
    const node=byId.get(selected),links=adjacent.get(selected),title=text(node);
    $('#node-title').textContent=title;$('#node-description').textContent=desc(node);
    $('.panel-index').textContent=links.length+' '+tr('CONNECTIONS','CONNEXIONS');
    $('#inline-node-title').textContent=title;$('#inline-node-count').textContent=links.length+' '+tr('connections to explore','connexions à explorer');
    const container=$('#node-connections');container.replaceChildren();const heading=document.createElement('p');heading.textContent=tr('CONNECTED NOTES','NOTES LIÉES');container.append(heading);
    const list=document.createElement('div');container.append(list);
    links.forEach(({id,edge})=>{
      const button=document.createElement('button');button.type='button';button.className='connection-chip';button.dataset.nodeLink=id;
      const name=document.createElement('span'),relation=document.createElement('small');name.textContent=text(byId.get(id));relation.textContent=edge.label[fr()?1:0];button.append(name,relation);button.addEventListener('click',()=>{choose(id);full.nodes.get(id).g.focus({preventScroll:true});});list.append(button);
    });
    const visit=$('#node-visit');visit.href=node.target?'#'+node.target:node.url;visit.textContent=tr(node.target?'Read on the page ↗':'Open source ↗',node.target?'Lire dans la page ↗':'Ouvrir la source ↗');
    if(node.target){visit.removeAttribute('target');visit.removeAttribute('rel');}else{visit.target='_blank';visit.rel='noopener noreferrer';}
    const sourceOld=$('.graph-source');if(sourceOld)sourceOld.remove();
    if(node.target&&node.url){const source=document.createElement('a');source.className='graph-source text-link';source.href=node.url;source.target='_blank';source.rel='noopener noreferrer';source.textContent=tr('Open linked source ↗','Ouvrir la source liée ↗');visit.after(source);}
    $('#graph-status').textContent=title+'. '+links.length+' '+tr('connections.','connexions.');
    const breadcrumbs=$('#graph-trail');breadcrumbs.replaceChildren();
    trail.slice(-6).forEach((id,index,shown)=>{
      if(index){const separator=document.createElement('span');separator.textContent='›';separator.setAttribute('aria-hidden','true');breadcrumbs.append(separator);}
      const button=document.createElement('button');button.type='button';button.textContent=text(byId.get(id));if(index===shown.length-1)button.setAttribute('aria-current','true');
      const fullIndex=trail.length-shown.length+index;button.addEventListener('click',()=>{trail=trail.slice(0,fullIndex+1);choose(id,false);});breadcrumbs.append(button);
    });
    $('#graph-back').disabled=trail.length<2;
    $('#graph-local').setAttribute('aria-pressed',String(mode==='local'));$('#graph-global').setAttribute('aria-pressed',String(mode==='global'));
    const floating=$('.floating-network');floating.setAttribute('aria-label',tr('Explore connections for ','Explorer les connexions de ')+title);
    views.forEach(labels);
  }
  function choose(id,remember=true){
    if(!byId.has(id))return;hover=null;
    if(remember&&selected!==id)trail.push(id);selected=id;
    panel();views.forEach(view=>layout(view,reduce()));paint();start();
  }
  function loop(now){
    if(reduce()||document.hidden||(!graphDialog.open&&!inlineVisible)){running=false;return;}
    if(now-last>32){tick+=Math.min(80,now-last)/1000;last=now;const view=graphDialog.open?full:inline;for(let i=0;i<2;i++)physics(view);paintView(view);}
    frame=requestAnimationFrame(loop);
  }
  function start(){if(!running&&!reduce()&&!document.hidden&&(inlineVisible||graphDialog.open)){running=true;last=performance.now();frame=requestAnimationFrame(loop);}}
  function resize(){views.forEach(size);views.forEach(view=>layout(view,reduce()));paint();start();}
  function close(dialog){dialog.close();}
  function openNetwork(button,id){
    opener=button;if(id)choose(id);if(paperDialog.open)paperDialog.close();
    if(!graphDialog.open){document.body.classList.add('dialog-open');graphDialog.showModal();}
    size(full);layout(full,reduce());paint();start();graphDialog.querySelector('.dialog-close').focus({preventScroll:true});
  }
  $$('.open-network').forEach(button=>button.addEventListener('click',()=>openNetwork(button)));
  $('.paper-preview').addEventListener('click',()=>{opener=$('.paper-preview');document.body.classList.add('dialog-open');paperDialog.showModal();paperDialog.querySelector('.dialog-close').focus();});
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>close(document.getElementById(button.dataset.close))));
  [graphDialog,paperDialog].forEach(dialog=>{
    dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');window.dispatchEvent(new Event('luc:motion'));if(opener&&document.contains(opener))opener.focus({preventScroll:true});start();});
    dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
  });
  $('#node-visit').addEventListener('click',e=>{
    const node=byId.get(selected);if(!node.target)return;e.preventDefault();close(graphDialog);
    const target=document.getElementById(node.target);if(target){let parent=target.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}}
    window.dispatchEvent(new CustomEvent('luc:visit',{detail:{target:node.target}}));
  });
  $('#graph-local').addEventListener('click',()=>{mode='local';choose(selected,false);});
  $('#graph-global').addEventListener('click',()=>{mode='global';choose(selected,false);});
  $('#graph-back').addEventListener('click',()=>{if(trail.length>1){trail.pop();choose(trail[trail.length-1],false);}});
  $('#reset-map').addEventListener('click',()=>{views.forEach(view=>{view.zoom=1;view.pan={x:0,y:0};layout(view,reduce());});paint();});
  $('#graph-zoom-in').addEventListener('click',()=>{full.zoom=Math.min(3,full.zoom*1.25);paint();});
  $('#graph-zoom-out').addEventListener('click',()=>{full.zoom=Math.max(.5,full.zoom/1.25);paint();});
  const normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const search=$('#graph-search'),results=$('#graph-results');
  search.addEventListener('input',()=>{
    const query=normal(search.value.trim());results.replaceChildren();if(!query){results.hidden=true;return;}
    const matches=data.nodes.filter(n=>n.label.some(label=>normal(label).includes(query))).slice(0,6);
    matches.forEach(node=>{const button=document.createElement('button');button.type='button';button.textContent=text(node);button.addEventListener('click',()=>{choose(node.id);search.value='';results.hidden=true;viewFocus(node.id);});results.append(button);});
    if(!matches.length){const empty=document.createElement('p');empty.textContent=tr('No matching note','Aucune note correspondante');results.append(empty);}results.hidden=false;
  });
  search.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&!results.hidden){e.preventDefault();results.querySelector('button')?.focus();}if(e.key==='Escape'){results.hidden=true;search.value='';e.stopPropagation();}});
  document.addEventListener('click',e=>{if(!e.target.closest('.graph-search'))results.hidden=true;});
  function viewFocus(id){full.nodes.get(id).g.focus({preventScroll:true});}
  // Skills and related-work controls are entrances into the same graph.
  const skillMap={'llm quantization':'compression','quantization':'compression','calibration':'calibration','responsible ai':'safety','ai safety':'safety','ai safety & alignment':'alignment','llms':'models','llm agents':'agents','multi-agent':'agents','multi-agent systems':'agents','python':'python','pytorch':'pytorch','transformers':'models','nlp':'nlp','langgraph':'langgraphlib','mcp':'mcp','erp':'erp'};
  $$('.tags span').forEach(span=>{
    const id=skillMap[normal(span.textContent.trim())];if(!id)return;
    const button=document.createElement('button');button.type='button';button.className='tag-graph';button.dataset.knowledgeNode=id;button.textContent=span.textContent;span.replaceWith(button);
  });
  $$('button[data-knowledge-node]').forEach(button=>button.addEventListener('click',()=>openNetwork(button,button.dataset.knowledgeNode)));
  const workNodes={'#':'luc','#main':'luc','#research':'thesis','#projects':'orders','#journey':'luc','#project-infologic':'orders','#publication':'paper','#project-agents':'langgraph','#project-gpt':'gpt','#experience-infologic':'infologic','#experience-orange':'orange','#experience-eric':'eric'};
  $$('a[href]').forEach(a=>{
    const source=data.nodes.find(n=>n.url===a.href),id=workNodes[a.getAttribute('href')]||source?.id;
    if(id)a.addEventListener('click',e=>{if(!e.defaultPrevented&&!graphDialog.open)choose(id);});
  });
  $$('.work-item').forEach(item=>{
    if(item.id==='project-infologic')return;
    const id=workNodes['#'+item.id];if(!id)return;
    const button=document.createElement('button');button.type='button';button.className='text-link work-graph-link';button.dataset.knowledgeNode=id;button.textContent=tr('Explore connections ◈','Explorer les connexions ◈');button.addEventListener('click',()=>openNetwork(button,id));item.append(button);
  });
  function localize(){
    search.placeholder=tr('Find a node…','Rechercher un nœud…');
    $$('[data-close]').forEach(b=>b.setAttribute('aria-label',tr('Close','Fermer')));
    $$('.tag-graph').forEach(b=>b.setAttribute('aria-label',tr('Explore connections for ','Explorer les connexions de ')+b.textContent));
    $$('.work-graph-link').forEach(b=>b.textContent=tr('Explore connections ◈','Explorer les connexions ◈'));
    panel();paint();
  }
  addEventListener('luc:language',localize);
  addEventListener('luc:motion',()=>{if(reduce()){cancelAnimationFrame(frame);running=false;views.forEach(v=>layout(v,true));paint();}else start();});
  addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{inlineVisible=entries[0].isIntersecting;if(inlineVisible)start();});observer.observe(inline.host);}
  views.forEach(size);localize();views.forEach(view=>layout(view,true));paint();start();
})();
