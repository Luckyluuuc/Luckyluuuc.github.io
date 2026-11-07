(() => {
  'use strict';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const language=()=>document.documentElement.lang==='fr'?1:0;
  const t=(en,fr)=>language()?fr:en;
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  let motionOff=document.body.classList.contains('motion-paused')||motionPreference.matches;
  const reduced=()=>motionOff;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,k)=>a+(b-a)*k;
  const graph=window.LUC_GRAPH;
  const notes=new Map(graph.nodes.map((n,i)=>[n.id,{...n,index:i}]));
  const links=graph.edges;
  const adjacency=new Map([...notes.keys()].map(id=>[id,[]]));
  links.forEach((edge,i)=>{edge.index=i;adjacency.get(edge.a).push({id:edge.b,edge});adjacency.get(edge.b).push({id:edge.a,edge});});
  const name=id=>notes.get(id).label[language()];
  const families={research:[145,223,187],engineering:[121,185,221],skills:[177,150,223],learning:[203,180,133],people:[171,199,193],profile:[205,255,233]};
  const familyName=family=>({research:t('RESEARCH','RECHERCHE'),engineering:t('ENGINEERING','INGÉNIERIE'),skills:t('SKILLS','COMPÉTENCES'),learning:t('LEARNING','FORMATION'),people:t('PEOPLE & PLACES','PERSONNES & LIEUX'),profile:t('A CONNECTED JOURNEY','UN PARCOURS CONNECTÉ')})[family];
  const dialog=$('#network-dialog'),paper=$('#paper-dialog');
  let selected='luc',hover=null,mode='local',extended=false,history=['luc'],historyIndex=0;
  let path=[],pathEdges=new Set(),distances=new Map(),waveAt=performance.now();
  let clock=0,lastFrame=0,frame=0,running=false,heroVisible=true,opener=null,ambientDirty=true,ambientHover=null;
  let detail=1,tickAt=0,frameLag=16.7,lagSamples=0;
  const textContext=document.createElement('canvas').getContext('2d');
  const views=[];
  function hash(str){let h=2166136261;for(const char of str){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function random(seed){let value=seed||1;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
  const rand=random(310591);
  function walk(root){const d=new Map([[root,0]]),queue=[root];for(let i=0;i<queue.length;i++)adjacency.get(queue[i]).forEach(({id})=>{if(!d.has(id)){d.set(id,d.get(queue[i])+1);queue.push(id);}});return d;}
  function route(from,to){const previous=new Map([[from,null]]),queue=[from];for(let i=0;i<queue.length&&!previous.has(to);i++)adjacency.get(queue[i]).forEach(({id})=>{if(!previous.has(id)){previous.set(id,queue[i]);queue.push(id);}});if(!previous.has(to))return[];const result=[];for(let id=to;id!==null;id=previous.get(id))result.unshift(id);return result;}
  const edgeKey=(a,b)=>[a,b].sort().join(':');
  const anchors={profile:{x:0,y:-.02,z:.35},research:{x:-.48,y:-.32,z:.04},engineering:{x:.28,y:.45,z:.12},skills:{x:.55,y:-.14,z:-.18},learning:{x:-.18,y:.52,z:-.28},people:{x:-.5,y:.2,z:-.14}};
  const primary={luc:[0,-.02,.45],safety:[-.62,-.28,.32],agents:[.22,-.57,.12],models:[.66,.12,.2],thesis:[-.15,-.52,-.22],paper:[.19,-.1,.65],infologic:[.28,.58,.3],polytech:[-.58,.4,-.04],orange:[-.62,.06,.46],orders:[.65,.42,.13]};
  const bases=new Map();
  const familyMembers={};notes.forEach(n=>(familyMembers[n.family]??=[]).push(n));
  notes.forEach(note=>{
    const r=random(hash(note.id)),members=familyMembers[note.family],i=members.indexOf(note),angle=i*2.39996323;
    const centre=anchors[note.family],radius=.16+.19*Math.sqrt((i+1)/members.length);
    const position={x:centre.x+Math.cos(angle)*radius,y:centre.y+Math.sin(angle)*radius*.9,z:centre.z+(r()-.5)*.49};
    if(primary[note.id]){const p=primary[note.id];position.x=p[0];position.y=p[1];position.z=p[2];}
    bases.set(note.id,position);
  });
  // Small unlabeled dendrites share the real note anchors and their family colours.
  const particles=[],microEdges=[],children=new Map([...notes.keys()].map(id=>[id,[]]));
  for(let pass=0;pass<24;pass++)notes.forEach(note=>{
    const degree=adjacency.get(note.id).length,weight=Math.min(24,3+degree*1.65);
    if(pass>=weight)return;
    const index=particles.length,angle=rand()*Math.PI*2,u=rand()*2-1,radius=.035+Math.pow(rand(),.6)*(.1+Math.min(degree,9)*.01);
    const particle={note:note.id,dx:Math.cos(angle)*Math.sqrt(1-u*u)*radius,dy:u*radius,dz:Math.sin(angle)*Math.sqrt(1-u*u)*radius,seed:rand(),size:.3+rand()*.8};
    particles.push(particle);const local=children.get(note.id);
    if(local.length){const parent=local[Math.max(0,Math.floor(rand()*Math.min(local.length,5)))];microEdges.push({a:index,b:parent,seed:rand()});if(local.length>4)microEdges.push({a:index,b:local[Math.floor(rand()*local.length)],seed:rand()});}
    local.push(index);
  });
  const microGroups=new Map([...notes.keys()].map(id=>[id,[]]));
  microEdges.forEach(edge=>microGroups.get(particles[edge.a].note).push(edge));
  // A generative fibre envelope unifies the semantic anchors into one spatial object.
  // It is visual texture; documented relationships are rendered separately below.
  const envelope=Array.from({length:23},(_,strand)=>{
    const phase=strand/23*Math.PI*2,points=[];
    for(let i=0;i<=72;i++){
      const angle=i/72*Math.PI*2,r=.88+.035*Math.sin(angle*5+phase*2);
      const x=Math.cos(angle)*r,y=Math.sin(angle)*r*.81;
      const z=Math.sin(angle*1.5+phase)*.31+Math.cos(phase)*.08;
      points.push({x,y,z});
    }
    return {points,family:['research','engineering','skills'][strand%3],seed:strand/23};
  });
  const sprites=new Map();
  const volumes=new Map();
  function volume(family){
    if(volumes.has(family))return volumes.get(family);
    const image=document.createElement('canvas');image.width=image.height=256;const c=image.getContext('2d');
    const gradient=c.createRadialGradient(128,128,0,128,128,128);gradient.addColorStop(0,`rgba(${families[family]},.045)`);gradient.addColorStop(1,`rgba(${families[family]},0)`);c.fillStyle=gradient;c.fillRect(0,0,256,256);volumes.set(family,image);return image;
  }
  function sprite(family){
    if(sprites.has(family))return sprites.get(family);
    const image=document.createElement('canvas');image.width=image.height=64;const c=image.getContext('2d');
    if(c){const color=families[family],g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,`rgba(${color},.6)`);g.addColorStop(.15,`rgba(${color},.24)`);g.addColorStop(.45,`rgba(${color},.06)`);g.addColorStop(1,`rgba(${color},0)`);c.fillStyle=g;c.fillRect(0,0,64,64);}
    sprites.set(family,image);return image;
  }
  function textWidth(value,font=12){if(textContext){textContext.font=`500 ${font}px "DM Sans", sans-serif`;const metrics=textContext.measureText(value);if(metrics?.width)return metrics.width;}return value.length*font*.55;}
  function formatLabel(value,font){const words=value.split(' '),lines=[''];for(const word of words){const i=lines.length-1;if(textWidth((lines[i]+' '+word).trim(),font)>124&&lines[i]&&lines.length<2)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}return lines;}
  function buildView(host,full){
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');const layer=document.createElement('div');layer.className='atlas-node-layer';layer.setAttribute('role','group');host.append(canvas,layer);
    const view={host,full,canvas,ctx:canvas.getContext('2d'),layer,w:1,h:1,r:1,dpr:1,buttons:new Map(),positions:new Map(),screen:new Map(),micro:[],visible:new Set(),near:new Set(),labelFont:12,dirty:true,yaw:-.13,pitch:-.13,aimYaw:-.13,aimPitch:-.13,zoom:1,targetZoom:1,panX:0,panY:0,drag:null,pointer:{x:0,y:0,inside:false},labelChoices:new Map()};
    notes.forEach(note=>{
      const p=bases.get(note.id);view.positions.set(note.id,{...p,tx:p.x,ty:p.y,tz:p.z,vx:0,vy:0,pinned:false});
      const button=document.createElement('button');button.type='button';button.className='atlas-node';button.dataset.node=note.id;button.dataset.family=note.family;button.setAttribute('aria-pressed','false');
      const dot=document.createElement('span');dot.className='atlas-dot';dot.setAttribute('aria-hidden','true');dot.style.setProperty('--node-size',(note.id==='luc'?11:clamp(4+adjacency.get(note.id).length*.4,5,9))+'px');
      const label=document.createElement('span');label.className='atlas-node-label';label.setAttribute('aria-hidden','true');button.append(dot,label);layer.append(button);view.buttons.set(note.id,{button,label,dot,width:100,height:28});
      let moved=false;
      button.addEventListener('click',()=>{if(moved){moved=false;return;}select(note.id);});
      button.addEventListener('pointerenter',()=>{hover=note.id;view.dirty=true;paint(view,performance.now());});
      button.addEventListener('pointerleave',()=>{hover=null;view.dirty=true;});
      button.addEventListener('focus',()=>{hover=note.id;view.dirty=true;paint(view,performance.now());});
      button.addEventListener('blur',()=>{hover=null;view.dirty=true;});
      button.addEventListener('keydown',event=>{if(['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();const other=adjacency.get(note.id).find(({id})=>view.visible.has(id));if(other)view.buttons.get(other.id).button.focus({preventScroll:true});}});
      button.addEventListener('pointerdown',event=>{
        if(!full||mode==='global')return;
        event.stopPropagation();moved=false;view.drag={type:'node',id:note.id,x:event.clientX,y:event.clientY};button.setPointerCapture(event.pointerId);
      });
      button.addEventListener('pointermove',event=>{
        if(view.drag?.type!=='node'||view.drag.id!==note.id)return;
        if(Math.hypot(event.clientX-view.drag.x,event.clientY-view.drag.y)<5&&!moved)return;
        moved=true;const bounds=host.getBoundingClientRect(),p=view.positions.get(note.id);
        p.x=(event.clientX-bounds.left-view.w*.5-view.panX)/(view.r*view.zoom);p.y=(event.clientY-bounds.top-view.h*.48-view.panY)/(view.r*view.zoom);p.pinned=true;view.dirty=true;paint(view,performance.now());
      });
      ['pointerup','pointercancel','lostpointercapture'].forEach(event=>button.addEventListener(event,()=>{view.drag=null;}));
    });
    host.addEventListener('pointerdown',event=>{
      if(event.target.closest('.atlas-node')||!full&&event.pointerType==='touch')return;
      view.drag={type:isSpatial(view)?'orbit':'pan',x:event.clientX,y:event.clientY,yaw:view.aimYaw,pitch:view.aimPitch,panX:view.panX,panY:view.panY};host.setPointerCapture(event.pointerId);
    });
    host.addEventListener('pointermove',event=>{
      const bounds=host.getBoundingClientRect();view.pointer={x:event.clientX-bounds.left,y:event.clientY-bounds.top,inside:true};
      if(view.drag?.type==='orbit'){view.aimYaw=view.drag.yaw+(event.clientX-view.drag.x)*.004;view.aimPitch=clamp(view.drag.pitch+(event.clientY-view.drag.y)*.003,-.65,.65);view.dirty=true;if(reduced()){view.yaw=view.aimYaw;view.pitch=view.aimPitch;paint(view,performance.now());}}
      else if(view.drag?.type==='pan'){view.panX=view.drag.panX+event.clientX-view.drag.x;view.panY=view.drag.panY+event.clientY-view.drag.y;view.dirty=true;paint(view,performance.now());}
    },{passive:true});
    host.addEventListener('pointerleave',()=>{view.pointer.inside=false;});
    ['pointerup','pointercancel','lostpointercapture'].forEach(event=>host.addEventListener(event,()=>{view.drag=null;}));
    if(full)host.addEventListener('wheel',event=>{event.preventDefault();view.targetZoom=clamp(view.targetZoom*Math.exp(-event.deltaY*.0013),.55,2.9);if(reduced()){view.zoom=view.targetZoom;paint(view,performance.now());}start();},{passive:false});
    views.push(view);return view;
  }
  const hero=buildView($('#inline-graph'),false),full=buildView($('#full-graph'),true);
  function isSpatial(view){return !view.full||mode==='global';}
  function labels(view){
    view.labelFont=13;
    view.buttons.forEach((item,id)=>{
      const label=name(id),font=id===selected?14:view.labelFont,lines=formatLabel(label,font);item.label.textContent=lines.join('\n');item.label.style.whiteSpace='pre';item.width=Math.max(...lines.map(line=>textWidth(line,font)))+16;item.height=lines.length*font*1.35+11;
      item.button.setAttribute('aria-label',label+' · '+adjacency.get(id).length+' '+t('connections','connexions'));
    });
    view.layer.setAttribute('aria-label',t('Interactive notes. Select a point to explore its connections.','Notes interactives. Sélectionnez un point pour explorer ses connexions.'));
  }
  function size(view){
    const rect=view.host.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
    view.w=rect.width;view.h=rect.height;view.r=Math.min(view.w*.45,view.h*.57);view.dpr=Math.min(devicePixelRatio||1,(innerWidth<761?1.5:1.75)*(detail<.8?.75:1));
    view.canvas.width=Math.round(view.w*view.dpr);view.canvas.height=Math.round(view.h*view.dpr);if(view.ctx)view.ctx.setTransform(view.dpr,0,0,view.dpr,0,0);labels(view);view.dirty=true;
  }
  function layout(view,snap=false){
    const spatial=isSpatial(view),direct=adjacency.get(selected).map(({id})=>id),directSet=new Set(direct);
    view.near=directSet;view.visible=new Set(spatial?[...notes.keys()]:[selected,...direct]);
    if(!spatial&&extended)distances.forEach((distance,id)=>{if(distance===2)view.visible.add(id);});
    view.positions.forEach((p,id)=>{const b=bases.get(id);p.tx=b.x;p.ty=b.y;p.tz=b.z;p.pinned=false;});
    if(!spatial){
      const root=view.positions.get(selected);root.tx=0;root.ty=-.04;root.tz=.25;
      const ordered=direct.slice().sort((a,b)=>{const aa=notes.get(a),bb=notes.get(b);return aa.family.localeCompare(bb.family)||name(a).localeCompare(name(b));});
      ordered.forEach((id,i)=>{const angle=-Math.PI*.5+i*Math.PI*2/ordered.length,p=view.positions.get(id),radius=direct.length>8?(i%2?.82:.67):.72;p.tx=Math.cos(angle)*radius*1.12;p.ty=Math.sin(angle)*radius*.88;p.tz=.05;});
      if(extended){const indirect=[...view.visible].filter(id=>id!==selected&&!directSet.has(id));indirect.forEach((id,i)=>{const p=view.positions.get(id),angle=i*2.39996;p.tx=Math.cos(angle)*.99;p.ty=Math.sin(angle)*.92;p.tz=-.12;});}
    }
    view.buttons.forEach(({button},id)=>{button.hidden=!view.visible.has(id);button.setAttribute('tabindex',view.visible.has(id)?'0':'-1');button.classList.toggle('is-selected',id===selected);button.classList.toggle('is-near',directSet.has(id));button.classList.toggle('is-distant',id!==selected&&!directSet.has(id));button.setAttribute('aria-pressed',String(id===selected));});
    view.labelChoices.clear();view.dirty=true;
    if(snap){view.positions.forEach(p=>{p.x=p.tx;p.y=p.ty;p.z=p.tz;p.vx=p.vy=0;});view.zoom=view.targetZoom;view.yaw=view.aimYaw;view.pitch=view.aimPitch;}
  }
  function simulate(view,dt){
    const ease=1-Math.exp(-Math.max(dt,16)/230),spatial=isSpatial(view);
    view.zoom=mix(view.zoom,view.targetZoom,ease);
    if(spatial&&!view.drag&&!hover&&!view.pointer.inside)view.aimYaw+=dt*.000024;
    view.yaw=mix(view.yaw,view.aimYaw,.09);view.pitch=mix(view.pitch,view.aimPitch,.09);
    view.positions.forEach(p=>{if(!p.pinned){p.x=mix(p.x,p.tx,ease);p.y=mix(p.y,p.ty,ease);p.z=mix(p.z,p.tz,ease);}});
    if(!spatial){
      const ids=[selected,...view.near];
      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
        const a=view.positions.get(ids[i]),b=view.positions.get(ids[j]),dx=(a.x-b.x)*view.r,dy=(a.y-b.y)*view.r;
        const aw=view.buttons.get(ids[i]).width,bw=view.buttons.get(ids[j]).width;
        const ox=(aw+bw)/2+14-Math.abs(dx),oy=52-Math.abs(dy);
        if(ox>0&&oy>0){if(ox<oy){const push=ox/view.r*.12*(dx>=0?1:-1);if(!a.pinned)a.x+=push;if(!b.pinned)b.x-=push;}else{const push=oy/view.r*.12*(dy>=0?1:-1);if(!a.pinned)a.y+=push;if(!b.pinned)b.y-=push;}}
      }
      ids.forEach(id=>{const p=view.positions.get(id),item=view.buttons.get(id),x=(view.w*.5-item.width*.5-10)/view.r,y=(view.h*.5-item.height-15)/view.r;p.x=clamp(p.x,-Math.max(.2,x),Math.max(.2,x));p.y=clamp(p.y,-Math.max(.2,y),Math.max(.2,y));});
    }
  }
  function project(view,p){
    if(!isSpatial(view))return{x:view.w*.5+p.x*view.r*view.zoom+view.panX,y:view.h*.48+p.y*view.r*view.zoom+view.panY,z:p.z,scale:1};
    const {co,si,ct,st}=view.rotation,x=p.x*co+p.z*si,z=-p.x*si+p.z*co;
    const y=p.y*ct-z*st,depth=p.y*st+z*ct,perspective=3.4/(3.4-depth);
    return{x:view.w*.5+x*view.r*view.zoom*perspective+view.panX,y:view.h*.46+y*view.r*view.zoom*perspective+view.panY,z:depth,scale:perspective};
  }
  function charge(id,now){if(reduced())return 0;const age=(now-waveAt)/1000-(distances.get(id)||0)*.14;return age>=0&&age<1.6?Math.exp(-age*3.3):0;}
  function opacity(view,id){if(id===selected)return 1;if(view.near.has(id))return 1;if(!isSpatial(view))return view.visible.has(id)?.35:.065;return .5;}
  function overlaps(a,b){return a.x<b.x+b.w+5&&a.x+a.w+5>b.x&&a.y<b.y+b.h+4&&a.y+a.h+4>b.y;}
  function placeLabels(view){
    const spatial=isSpatial(view),placed=[],primaryIds=new Set(['luc','safety','agents','models','infologic','paper','thesis','polytech']);
    const ordered=[...view.visible].sort((a,b)=>{
      const rank=id=>id===hover?10000:id===selected?9000:path.includes(id)?7500:primaryIds.has(id)?6500:view.near.has(id)?5000:adjacency.get(id).length*20;
      return rank(b)-rank(a)+(view.screen.get(b)?.z||0)-(view.screen.get(a)?.z||0);
    });
    let count=0;const max=spatial?(view.full?22:innerWidth<761?6:8):extended?20:Math.max(10,view.near.size+1);
    ordered.forEach(id=>{
      const item=view.buttons.get(id),point=view.screen.get(id);if(!point)return;
      const force=id===selected||id===hover,eligible=force||(!spatial&&view.near.has(id))||count<max&&(primaryIds.has(id)||view.near.has(id)||view.full);
      if(!eligible){setLabelVisible(item,false);return;}
      const w=item.width,h=item.height,gap=id===selected?12:10;
      const candidates=[{x:point.x-w/2,y:point.y+gap},{x:point.x-w/2,y:point.y-h-gap},{x:point.x+gap,y:point.y-h/2},{x:point.x-w-gap,y:point.y-h/2}];
      const old=view.labelChoices.get(id);const sequence=old!==undefined?[old,...[0,1,2,3].filter(x=>x!==old)]:[0,1,2,3];
      let chosen=null,index=0;
      for(const candidateIndex of sequence){const candidate={...candidates[candidateIndex],w,h};if(candidate.x<7||candidate.x+w>view.w-7||candidate.y<5||candidate.y+h>view.h-6)continue;if(!placed.some(other=>overlaps(candidate,other))){chosen=candidate;index=candidateIndex;break;}}
      if(!chosen&&force){chosen={x:clamp(point.x-w/2,7,view.w-w-7),y:clamp(point.y+gap,5,view.h-h-6),w,h};}
      if(!chosen){setLabelVisible(item,false);return;}
      const offset=`translate(${Math.round((chosen.x-point.x)*2)/2}px,${Math.round((chosen.y-point.y)*2)/2}px)`;
      if(item.labelOffset!==offset){item.label.style.transform=offset;item.labelOffset=offset;}
      setLabelVisible(item,true);view.labelChoices.set(id,index);placed.push(chosen);count++;
    });
  }
  function setLabelVisible(item,visible){if(item.labelVisible!==visible){item.button.dataset.labelHidden=String(!visible);item.labelVisible=visible;}}
  function paint(view,now){
    if(!view.ctx||view.w<2||view.full&&!dialog.open)return;
    const c=view.ctx,spatial=isSpatial(view);c.clearRect(0,0,view.w,view.h);
    view.rotation={co:Math.cos(view.yaw),si:Math.sin(view.yaw),ct:Math.cos(view.pitch),st:Math.sin(view.pitch)};
    const pulses=new Map([...notes.keys()].map(id=>[id,charge(id,now)]));
    view.screen.clear();view.positions.forEach((position,id)=>view.screen.set(id,project(view,position)));
    c.globalCompositeOperation='lighter';
    // Broad, almost imperceptible colour volumes give the filaments depth.
    if(spatial)for(const [family,anchor] of Object.entries(anchors)){
      if(family==='profile')continue;const p=project(view,anchor),radius=view.r*.64;c.drawImage(volume(family),p.x-radius,p.y-radius,radius*2,radius*2);
    }
    if(spatial){
      envelope.forEach((strand,index)=>{
        if(detail<.8&&index%3===1||detail<.6&&index%2===1)return;
        const color=families[strand.family];
        c.strokeStyle=`rgba(${color},${index%4===0?.062:.028})`;c.lineWidth=index%4===0?.65:.45;c.beginPath();
        strand.points.forEach((point,i)=>{const p=project(view,point);if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);});c.stroke();
        if(!reduced()&&index%3===0){
          const at=(clock*.045+strand.seed)%1,point=strand.points[Math.floor(at*72)],p=project(view,point);
          c.fillStyle=`rgba(${color},.45)`;c.beginPath();c.arc(p.x,p.y,1.1,0,Math.PI*2);c.fill();
        }
      });
    }
    const limit=Math.round((innerWidth<761?Math.min(particles.length,340):particles.length)*detail);
    for(let i=0;i<limit;i++){
      const particle=particles[i],anchor=view.positions.get(particle.note),motion=reduced()?0:Math.sin(clock*.3+particle.seed*9)*.003;
      const localScale=spatial?1:.65;view.micro[i]=project(view,{x:anchor.x+particle.dx*localScale,y:anchor.y+(particle.dy+motion)*localScale,z:anchor.z+particle.dz*localScale});
    }
    c.lineWidth=.45;
    microGroups.forEach((edges,id)=>{
      const note=notes.get(id),strength=opacity(view,id),pulse=pulses.get(id);c.strokeStyle=`rgba(${families[note.family]},${(.085+pulse*.16)*strength})`;c.beginPath();
      edges.forEach(edge=>{if(edge.a>=limit||edge.b>=limit)return;const a=view.micro[edge.a],b=view.micro[edge.b];c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);});c.stroke();
    });
    for(let i=0;i<limit;i++){
      const particle=particles[i],note=notes.get(particle.note),p=view.micro[i],strength=opacity(view,note.id),pulse=pulses.get(note.id);
      const alpha=(.21+(p.z+.7)*.2+pulse*.38)*strength;
      if(i%23===0&&spatial){const radius=(6+pulse*6)*p.scale;c.globalAlpha=alpha*.45;c.drawImage(sprite(note.family),p.x-radius,p.y-radius,radius*2,radius*2);c.globalAlpha=1;}
      c.fillStyle=`rgba(${families[note.family]},${clamp(alpha,0,.8)})`;c.beginPath();c.arc(p.x,p.y,Math.max(.25,particle.size*p.scale),0,Math.PI*2);c.fill();
    }
    links.forEach(edge=>{
      const a=view.screen.get(edge.a),b=view.screen.get(edge.b),na=notes.get(edge.a),nb=notes.get(edge.b),near=edge.a===selected||edge.b===selected,over=edge.a===hover||edge.b===hover,onPath=pathEdges.has(edgeKey(edge.a,edge.b));
      const context=Math.min(opacity(view,edge.a),opacity(view,edge.b)),seed=hash(edge.a+edge.b)%997/997;
      let alpha=(onPath?.56:over?.45:near?.33:.115)*context;if(!spatial&&!view.visible.has(edge.a)||!spatial&&!view.visible.has(edge.b))alpha*=.35;
      if(alpha<.003)return;const color=families[na.family],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,bend=(seed-.5)*(spatial?view.r*.9:Math.min(32,len*.16));
      const cx=(a.x+b.x)/2-dy/len*bend,cy=(a.y+b.y)/2+dx/len*bend;
      const fibres=spatial?(near||onPath?(detail<.8?4:7):(detail<.8?1:3)):1;
      for(let fibre=0;fibre<fibres;fibre++){
        const offset=(fibre-(fibres-1)/2)*3.6;
        const central=fibre===Math.floor(fibres/2);c.lineWidth=onPath&&central?1.15:central?.7:.45;c.strokeStyle=`rgba(${color},${alpha*(fibres===1?1:central?1:.27)})`;
        c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(cx+offset,cy-offset,b.x,b.y);c.stroke();
      }
      if(!reduced()&&(near||onPath||over)){
        const progress=(clock*(onPath?.22:.13)+seed)%1,inv=1-progress,x=inv*inv*a.x+2*inv*progress*cx+progress*progress*b.x,y=inv*inv*a.y+2*inv*progress*cy+progress*progress*b.y;
        const prev=Math.max(0,progress-.045),pi=1-prev,xx=pi*pi*a.x+2*pi*prev*cx+prev*prev*b.x,yy=pi*pi*a.y+2*pi*prev*cy+prev*prev*b.y;
        c.strokeStyle=`rgba(${color},${onPath?.85:.48})`;c.lineWidth=1.2;c.beginPath();c.moveTo(xx,yy);c.lineTo(x,y);c.stroke();c.fillStyle=`rgba(${color},.85)`;c.beginPath();c.arc(x,y,onPath?1.8:1.2,0,Math.PI*2);c.fill();
      }
    });
    const selectedPoint=view.screen.get(selected),selectedFamily=notes.get(selected).family;
    if(selectedPoint){const radius=35+pulses.get(selected)*10;c.globalAlpha=.38;c.drawImage(sprite(selectedFamily),selectedPoint.x-radius,selectedPoint.y-radius,radius*2,radius*2);c.globalAlpha=1;}
    c.globalCompositeOperation='source-over';
    view.buttons.forEach(({button,dot},id)=>{
      if(!view.visible.has(id))return;const p=view.screen.get(id),item=view.buttons.get(id);
      const transform=`translate3d(${Math.round((p.x-22)*2)/2}px,${Math.round((p.y-22)*2)/2}px,0)`,z=id===selected?50:id===hover?60:Math.round((p.z+2)*5),over=id===hover;
      if(item.transform!==transform){button.style.transform=transform;item.transform=transform;}
      if(item.z!==z){button.style.zIndex=z;item.z=z;}
      if(item.over!==over){button.classList.toggle('is-hovered',over);item.over=over;}
      const alpha=id===selected?1:Math.round(clamp((.45+p.z*.25)*opacity(view,id)+pulses.get(id)*.5,.18,.95)*50)/50;
      if(item.alpha!==alpha){dot.style.opacity=alpha;item.alpha=alpha;}
    });
    placeLabels(view);view.dirty=false;
  }
  function panel(){
    const note=notes.get(selected),connected=adjacency.get(selected);
    $('#node-title').textContent=name(selected);$('#node-description').textContent=note.description[language()];$('.panel-index').textContent=familyName(note.family)+' / '+String(connected.length).padStart(2,'0')+' '+t('CONNECTIONS','CONNEXIONS');
    $('#inline-node-title').textContent=name(selected);$('#inline-node-kind').textContent=familyName(note.family);$('#inline-node-count').textContent=connected.length+' '+t('connections to explore','connexions à explorer');
    const list=$('#node-connections');list.replaceChildren();const heading=document.createElement('p');heading.textContent=t('CONNECTED NOTES','NOTES LIÉES');const container=document.createElement('div');list.append(heading,container);
    connected.slice().sort((a,b)=>name(a.id).localeCompare(name(b.id))).forEach(({id,edge})=>{
      const button=document.createElement('button');button.type='button';button.className='connection-chip';button.dataset.nodeLink=id;const title=document.createElement('span'),label=document.createElement('small');title.textContent=name(id);label.textContent=edge.label[language()];button.append(title,label);button.addEventListener('click',()=>{select(id);full.buttons.get(id).button.focus({preventScroll:true});});container.append(button);
    });
    const visit=$('#node-visit');visit.href=note.target?'#'+note.target:note.url;visit.textContent=note.target?t('Read on the page ↗','Lire dans la page ↗'):t('Open source ↗','Ouvrir la source ↗');
    if(note.target){visit.removeAttribute('target');visit.removeAttribute('rel');}else{visit.target='_blank';visit.rel='noopener noreferrer';}
    $$('.graph-source').forEach(a=>a.remove());if(note.url&&note.target){const source=document.createElement('a');source.href=note.url;source.className='graph-source text-link';source.target='_blank';source.rel='noopener noreferrer';source.textContent=t('Original source ↗','Source originale ↗');$('.atlas-note-actions').append(source);}
    const routeBox=$('#node-path');routeBox.replaceChildren();if(path.length>1){const title=document.createElement('p');title.textContent=t('HOW IT CONNECTS','LE FIL CONDUCTEUR');const items=document.createElement('div');routeBox.append(title,items);path.forEach((id,i)=>{if(i){const separator=document.createElement('span');separator.textContent='›';separator.setAttribute('aria-hidden','true');items.append(separator);}const button=document.createElement('button');button.type='button';button.textContent=name(id);button.addEventListener('click',()=>select(id));items.append(button);});}
    const trail=$('#graph-trail');trail.replaceChildren();const first=Math.max(0,historyIndex-4);history.slice(first,historyIndex+1).forEach((id,i)=>{if(i){const separator=document.createElement('span');separator.textContent='›';trail.append(separator);}const button=document.createElement('button');button.type='button';button.textContent=name(id);if(i+first===historyIndex)button.setAttribute('aria-current','true');button.addEventListener('click',()=>{historyIndex=first+i;select(id,false);});trail.append(button);});
    $('#graph-back').disabled=historyIndex===0;$('#graph-forward').disabled=historyIndex===history.length-1;$('#graph-local').setAttribute('aria-pressed',String(mode==='local'));$('#graph-global').setAttribute('aria-pressed',String(mode==='global'));$('#graph-depth').setAttribute('aria-pressed',String(extended));$('#graph-depth').hidden=mode==='global';
    $('#graph-hint').textContent=mode==='global'?t('Drag to orbit · Scroll to zoom · Select a point.','Glissez pour orienter · Défilez pour zoomer · Sélectionnez un point.'):t('Select a note · Drag to rearrange · Scroll to zoom.','Sélectionnez une note · Glissez pour déplacer · Défilez pour zoomer.');
    $('#graph-status').textContent=name(selected)+'. '+connected.length+' '+t('connected notes.','notes liées.');
    views.forEach(labels);$('.floating-network').setAttribute('aria-label',t('Explore connections for ','Explorer les connexions de ')+name(selected));
  }
  function select(id,remember=true){
    if(!notes.has(id))return;
    if(remember&&id!==selected){history=history.slice(0,historyIndex+1);history.push(id);historyIndex=history.length-1;}
    selected=id;hover=null;distances=walk(id);path=route('luc',id);pathEdges=new Set(path.slice(1).map((n,i)=>edgeKey(path[i],n)));waveAt=performance.now();
    panel();views.forEach(view=>{layout(view,reduced());paint(view,performance.now());});start();
  }
  function visibleView(){return dialog.open?full:heroVisible?hero:null;}
  function loop(now){
    const view=visibleView();if(reduced()||document.hidden||paper.open||!view){running=false;return;}
    if(tickAt&&now-tickAt<250){frameLag=frameLag*.94+(now-tickAt)*.06;lagSamples++;}
    tickAt=now;
    // Reduce only ornamental fibres on slower devices; all real notes and links remain.
    if(lagSamples>35){const next=frameLag>35?.55:frameLag>24?.75:1;if(next<detail){detail=next;size(view);}lagSamples=0;}
    if(now-lastFrame>=1000/(innerWidth<761?30:36)-1){
      const dt=Math.min(now-lastFrame,70);lastFrame=now;clock+=dt/1000;simulate(view,dt);paint(view,now);
    }
    drawAmbient(now);frame=requestAnimationFrame(loop);
  }
  function start(){if(!running&&!reduced()&&!document.hidden&&!paper.open&&visibleView()){running=true;lastFrame=performance.now();tickAt=0;frame=requestAnimationFrame(loop);}}
  function refresh(){views.forEach(view=>{size(view);layout(view,reduced());paint(view,performance.now());});ambientDirty=true;drawAmbient(performance.now());start();}
  function openAtlas(button,id){
    opener=button;if(id)select(id);if(paper.open)paper.close();document.body.classList.add('dialog-open');if(!dialog.open)dialog.showModal();size(full);layout(full,true);paint(full,performance.now());start();dialog.querySelector('.dialog-close').focus({preventScroll:true});
  }
  $$('.open-network').forEach(button=>button.addEventListener('click',()=>openAtlas(button,button.dataset.contextNote)));
  $('.paper-preview').addEventListener('click',()=>{opener=$('.paper-preview');document.body.classList.add('dialog-open');paper.showModal();paper.querySelector('.dialog-close').focus({preventScroll:true});});
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
  [dialog,paper].forEach(modal=>{
    modal.addEventListener('close',()=>{document.body.classList.remove('dialog-open');if(opener&&document.contains(opener))opener.focus({preventScroll:true});hero.dirty=true;start();});
    modal.addEventListener('click',event=>{const bounds=modal.getBoundingClientRect();if(event.target===modal&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom))modal.close();});
  });
  $('#node-visit').addEventListener('click',event=>{const note=notes.get(selected);if(!note.target)return;event.preventDefault();opener=null;dialog.close();const element=document.getElementById(note.target);if(element){let parent=element.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}}window.dispatchEvent(new CustomEvent('luc:visit',{detail:{target:note.target}}));});
  $('#graph-local').addEventListener('click',()=>{mode='local';full.panX=full.panY=0;full.zoom=full.targetZoom=1;select(selected,false);});
  $('#graph-global').addEventListener('click',()=>{mode='global';full.panX=full.panY=0;full.zoom=full.targetZoom=1;select(selected,false);});
  $('#graph-depth').addEventListener('click',()=>{extended=!extended;select(selected,false);});
  $('#graph-back').addEventListener('click',()=>{if(historyIndex>0){historyIndex--;select(history[historyIndex],false);}});
  $('#graph-forward').addEventListener('click',()=>{if(historyIndex<history.length-1){historyIndex++;select(history[historyIndex],false);}});
  $('#graph-zoom-in').addEventListener('click',()=>zoom(1.3));$('#graph-zoom-out').addEventListener('click',()=>zoom(1/1.3));
  function zoom(factor){full.targetZoom=clamp(full.targetZoom*factor,.55,2.9);if(reduced()){full.zoom=full.targetZoom;paint(full,performance.now());}start();}
  $('#reset-map').addEventListener('click',()=>{full.panX=full.panY=0;full.aimYaw=full.yaw=-.13;full.aimPitch=full.pitch=-.13;full.targetZoom=full.zoom=1;layout(full,true);paint(full,performance.now());});
  const normalized=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const search=$('#graph-search'),results=$('#graph-results');
  search.addEventListener('input',()=>{
    const query=normalized(search.value.trim());results.replaceChildren();if(!query){results.hidden=true;return;}
    const matches=[...notes.values()].filter(note=>note.label.some(value=>normalized(value).includes(query))).sort((a,b)=>adjacency.get(b.id).length-adjacency.get(a.id).length).slice(0,6);
    matches.forEach(note=>{const button=document.createElement('button');button.type='button';button.textContent=name(note.id);button.addEventListener('click',()=>{select(note.id);search.value='';results.hidden=true;full.buttons.get(note.id).button.focus({preventScroll:true});});results.append(button);});
    if(!matches.length){const empty=document.createElement('p');empty.textContent=t('No matching note','Aucune note correspondante');results.append(empty);}results.hidden=false;
  });
  search.addEventListener('keydown',event=>{if(event.key==='ArrowDown'&&!results.hidden){event.preventDefault();results.querySelector('button')?.focus();}if(event.key==='Escape'){results.hidden=true;search.value='';event.stopPropagation();}});
  document.addEventListener('click',event=>{if(!event.target.closest('.graph-search'))results.hidden=true;});
  const skillMap={'llm quantization':'compression','quantization':'compression','calibration':'calibration','responsible ai':'safety','ai safety':'safety','ai safety & alignment':'alignment','llms':'models','llm agents':'agents','multi-agent':'agents','multi-agent systems':'agents','python':'python','pytorch':'pytorch','transformers':'attention','nlp':'nlp','langgraph':'langgraphlib','mcp':'mcp','erp':'erp','hugging face':'huggingface','gcp':'gcp','neural networks':'ml','reinforcement learning':'rl'};
  $$('.tags span').forEach(span=>{const id=skillMap[normalized(span.textContent.trim())];if(!id)return;const button=document.createElement('button');button.type='button';button.className='tag-graph';button.dataset.knowledgeNode=id;button.textContent=span.textContent;span.replaceWith(button);});
  $$('button[data-knowledge-node]').forEach(button=>button.addEventListener('click',()=>openAtlas(button,button.dataset.knowledgeNode)));
  const workNodes={'#':'luc','#main':'luc','#research':'thesis','#projects':'orders','#journey':'luc','#project-infologic':'orders','#publication':'paper','#project-agents':'langgraph','#project-gpt':'gpt','#experience-infologic':'infologic','#experience-orange':'orange','#experience-eric':'eric'};
  $$('a[href]').forEach(link=>{const source=[...notes.values()].find(n=>n.url===link.href),id=workNodes[link.getAttribute('href')]||source?.id;if(id)link.addEventListener('click',event=>{if(!event.defaultPrevented&&!dialog.open)select(id);});});
  $$('.work-item').forEach(item=>{if(item.id==='project-infologic')return;const id=workNodes['#'+item.id];if(!id)return;const button=document.createElement('button');button.type='button';button.className='text-link work-graph-link';button.textContent=t('Explore connections ◈','Explorer les connexions ◈');button.addEventListener('click',()=>openAtlas(button,id));item.append(button);});
  // The page spine follows real sections. It does not represent a neural architecture.
  const ambient=$('#atlas-ambient'),ambientContext=ambient.getContext('2d');
  const sections=$$('#research,#projects,#journey,#toolkit,#recommendations,#contact');let sectionGeometry=[],activeSection='research',ambientWidth=0,ambientHeight=0;
  function geometry(){
    ambientWidth=innerWidth;ambientHeight=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5);ambient.width=Math.round(ambientWidth*dpr);ambient.height=Math.round(ambientHeight*dpr);if(ambientContext)ambientContext.setTransform(dpr,0,0,dpr,0,0);
    const end=$('.hero').getBoundingClientRect().bottom;document.body.classList.toggle('network-compact',end<innerHeight*.25);
    let nearest=Infinity;sectionGeometry=sections.map(section=>{const title=section.querySelector('.section-head')||section,rect=title.getBoundingClientRect(),distance=Math.abs(rect.top-innerHeight*.25);if(distance<nearest){nearest=distance;activeSection=section.id;}return{id:section.id,x:rect.left-15,y:rect.top+8};});
    const sectionNotes={research:'thesis',projects:'orders',journey:'luc',toolkit:'ml',recommendations:'frederic',contact:'luc'};
    $$('.floating-network,.rail-explore').forEach(button=>{button.dataset.contextNote=sectionNotes[activeSection]||selected;});
    $$('.neural-rail a').forEach(link=>{const current=link.dataset.section===activeSection;link.classList.toggle('active',current);if(current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});ambientDirty=true;
  }
  function drawAmbient(now){
    if(!ambientContext||!ambientDirty&&!ambientHover)return;
    const c=ambientContext;c.clearRect(0,0,ambientWidth,ambientHeight);if(ambientWidth<1101||heroVisible)return;
    const origin=ambientWidth>=1400?Math.max(25,(ambientWidth-1400)/2+25)+9:35,centre=ambientHeight*.49;
    c.lineWidth=.7;
    sectionGeometry.forEach(point=>{if(point.y<100||point.y>ambientHeight-30)return;const active=point.id===activeSection;c.strokeStyle=`rgba(148,204,177,${active?.19:.07})`;c.beginPath();c.moveTo(origin,centre);c.bezierCurveTo(origin+30,centre,origin+35,point.y,point.x,point.y);c.stroke();c.fillStyle=active?'#a2d5bb':'#416f63';c.beginPath();c.arc(point.x,point.y,active?2.5:1.5,0,Math.PI*2);c.fill();});
    if(ambientHover){const rect=ambientHover.getBoundingClientRect(),x=rect.left-6,y=rect.top+Math.min(40,rect.height*.25);if(y>90&&y<ambientHeight-20){c.strokeStyle='rgba(165,225,195,.34)';c.beginPath();c.moveTo(origin,centre);c.bezierCurveTo(origin+40,centre,x-40,y,x,y);c.stroke();c.fillStyle='#afe8c9';c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();}}
    ambientDirty=false;
  }
  let scrollQueued=false;
  addEventListener('scroll',()=>{if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{geometry();drawAmbient(performance.now());scrollQueued=false;});},{passive:true});
  $$('.work-item,.timeline-item').forEach(item=>{item.addEventListener('pointerenter',()=>{ambientHover=item;drawAmbient(performance.now());});item.addEventListener('pointerleave',()=>{ambientHover=null;ambientDirty=true;drawAmbient(performance.now());});});
  function localize(){const controls={'graph-back':['Previous note','Note précédente'],'graph-forward':['Next note','Note suivante'],'graph-zoom-in':['Zoom in','Agrandir'],'graph-zoom-out':['Zoom out','Réduire'],'reset-map':['Recenter the view','Recentrer la vue']};Object.entries(controls).forEach(([id,labels])=>document.getElementById(id).setAttribute('aria-label',labels[language()]));search.placeholder=t('Find a note…','Rechercher une note…');$$('[data-close]').forEach(button=>button.setAttribute('aria-label',t('Close','Fermer')));$$('.tag-graph').forEach(button=>button.setAttribute('aria-label',t('Explore connections for ','Explorer les connexions de ')+button.textContent));$$('.work-graph-link').forEach(button=>button.textContent=t('Explore connections ◈','Explorer les connexions ◈'));panel();views.forEach(view=>{view.dirty=true;paint(view,performance.now());});}
  addEventListener('luc:language',localize);
  function updateMotion(){motionOff=document.body.classList.contains('motion-paused')||motionPreference.matches;if(reduced()){cancelAnimationFrame(frame);running=false;views.forEach(view=>{layout(view,true);paint(view,performance.now());});drawAmbient(performance.now());}else start();}
  addEventListener('luc:motion',updateMotion);motionPreference.addEventListener('change',updateMotion);
  addEventListener('resize',()=>{refresh();geometry();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;ambientDirty=true;if(heroVisible)start();drawAmbient(performance.now());},{threshold:0});observer.observe(hero.host);}
  views.forEach(size);distances=walk(selected);path=['luc'];panel();views.forEach(view=>{layout(view,true);paint(view,performance.now());});geometry();drawAmbient(performance.now());start();
  if(document.fonts?.ready)document.fonts.ready.then(()=>{views.forEach(labels);views.forEach(view=>{view.dirty=true;paint(view,performance.now());});});
})();
