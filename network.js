(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const fr = () => document.documentElement.lang === 'fr';
  const words = (en, french) => fr() ? french : en;
  const paused = () => document.body.classList.contains('motion-paused');
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || paused();
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const colors = [[142,232,211],[177,159,237],[123,184,222]];
  const sections = $$('#research, #projects, #journey, #toolkit, #recommendations, #contact');
  const stage = $('.network-stage'), research = $('.research-network'), contact = $('.contact-network-anchor');
  const canvas = $('#network'), ctx = canvas.getContext('2d');
  let width = innerWidth, height = innerHeight, active = -1, selectedSection = 'research';
  let scene = 0, yaw = -.2, rotationX = 0, rotationY = 0, mouseX = 0, mouseY = 0, dragging = false;
  let clock = 0, lastFrame = 0, worldFrame = 0, worldRunning = false, needsGeometry = true;
  let target = {x: width*.74, y: height*.47, scale:230, alpha:1};
  let camera = {...target};
  const nodes = [], edges = [], projection = [];
  let interfaceTarget=null;
  let seed = 81731;
  const rand = () => { seed = seed * 16807 % 2147483647; return (seed-1)/2147483646; };
  const tuning={density:85,connections:90,activity:75};
  try {
    const saved=JSON.parse(localStorage.getItem('luc-network-tuning')||'null');
    if(saved)Object.keys(tuning).forEach(key=>{const value=Number(saved[key]);if(Number.isFinite(value))tuning[key]=clamp(value,key==='activity'?0:35,100);});
  } catch { /* Visual preferences are optional. */ }
  const count = width < 761 ? 360 : 720;
  const adjacency=Array.from({length:count},()=>[]),edgeKeys=new Map();
  let lastAuto=-3,lastHover=-1,cursor={x:0,y:0,inside:false};
  for (let i = 0; i < count; i++) {
    // This permutation spreads every density prefix over the whole volume.
    const f = (((i*377)%count)+.5)/count,theta=i*Math.PI*(3-Math.sqrt(5));
    const phi=Math.acos(1-2*f),shell=i%4?.85+rand()*.15:.25+rand()*.54;
    const folded=1+.08*Math.sin(phi*14+theta*3)*Math.sin(theta*2);
    let x=Math.sin(phi)*Math.cos(theta)*shell*folded;x+=Math.sign(x)*.065;
    const brain={x,y:Math.cos(phi)*shell*.86,z:Math.sin(phi)*Math.sin(theta)*shell*.74};
    const group=x<-.25?0:x>.25?1:2;
    const column={x:(group-1)*.8+(rand()-.5)*.12,y:0,z:(rand()-.5)*.55};
    const angle=f*Math.PI*23;
    const thread={x:Math.sin(angle)*.17,y:(f-.5)*3.5,z:Math.cos(angle)*.17};
    const sphere={x:Math.sin(phi)*Math.cos(theta)*.88,y:Math.cos(phi)*.88,z:Math.sin(phi)*Math.sin(theta)*.88};
    nodes.push({layouts:[brain,column,thread,sphere],x:brain.x,y:brain.y,z:brain.z,group,size:.45+rand()*1.3,fireAt:-99,fireStrength:0,charge:0,hub:i%43===0});
  }
  for(let group=0;group<3;group++){
    const cluster=nodes.filter(n=>n.group===group);cluster.forEach((n,i)=>{n.layouts[1].y=(i/(cluster.length-1)-.5)*1.5;});
  }
  function addEdge(a,b,backbone=false,long=false){
    const key=Math.min(a,b)+':'+Math.max(a,b);
    if(edgeKeys.has(key)){const existing=edgeKeys.get(key);existing.backbone ||= backbone;existing.long ||= long;return;}
    const edge={a,b,backbone,long,phase:rand(),rank:rand(),signal:rand()>.7||long,curve:(rand()-.5)*26};edgeKeys.set(key,edge);edges.push(edge);
    adjacency[a].push(b);adjacency[b].push(a);
  }
  for(let i=0;i<count;i++){
    const p=nodes[i].layouts[0];
    const near=nodes.map((n,j)=>({j,d:(p.x-n.layouts[0].x)**2+(p.y-n.layouts[0].y)**2+(p.z-n.layouts[0].z)**2})).filter(v=>v.j!==i).sort((a,b)=>a.d-b.d);
    // A nearest-earlier backbone keeps every visible density prefix connected.
    if(i>0)addEdge(i,near.find(v=>v.j<i).j,true);
    near.slice(0,6).forEach(v=>addEdge(i,v.j));
  }
  // Curved fiber bundles connect distant regions, in addition to local synapses.
  for(let i=0;i<count;i+=9)addEdge(i,(i+Math.floor(count*.43))%count,false,true);
  canvas.dataset.neurons=String(count);canvas.dataset.connections=String(edges.length);
  function visibleCount(){return Math.round(count*tuning.density/100);}
  function stimulate(root,strength=1){
    if(paused()||tuning.activity===0||root<0)return;
    const limit=visibleCount(),seen=new Set([root]);let frontier=[root];
    for(let hop=0;hop<5&&frontier.length;hop++){
      const next=[];
      frontier.forEach(index=>{
        const n=nodes[index];n.fireAt=clock+hop*.115;n.fireStrength=strength*Math.pow(.72,hop);
        adjacency[index].forEach(j=>{if(j<limit&&!seen.has(j)){seen.add(j);next.push(j);}});
      });frontier=next;
    }
  }
  const railLinks=$$('.neural-rail a');
  function updateGeometry() {
    needsGeometry=false;
    const h=stage.getBoundingClientRect(), r=research.getBoundingClientRect(), c=contact.getBoundingClientRect();
    scene = h.bottom>height*.55 ? 0 : r.top<height*.75&&r.bottom>height*.25 ? 1 : c.top<height*.8&&c.bottom>height*.2 ? 3 : 2;
    const compact = h.bottom < height*.33;
    document.body.classList.toggle('network-compact',compact);
    if(scene===0) target={x:h.left+h.width*.5,y:h.top+h.height*.43,scale:Math.min(h.width*.44,h.height*.44),alpha:1};
    if(scene===1) target={x:r.left+r.width*.5,y:r.top+r.height*.43,scale:Math.min(r.width*.42,r.height*.4),alpha:.9};
    if(scene===2) target={x:width>1100?(width>=1400?Math.max(25,(width-1400)/2+25)+9:35):width-13,y:height*.49,scale:Math.min(height*.26,170),alpha:width>1100?.3:.12};
    if(scene===3) target={x:c.left+c.width*.5,y:c.top+c.height*.5,scale:c.width*.38,alpha:.43};
    let min=Infinity;
    sections.forEach(section=>{
      const rect=section.getBoundingClientRect();
      const distance=Math.abs(rect.top-height*.27);
      if(distance<min){min=distance;selectedSection=section.id;}
    });
    railLinks.forEach(a=>{
      const current=a.dataset.section===selectedSection;a.classList.toggle('active',current);
      if(current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
    });
    if(reduceMotion()) {camera={...target};nodes.forEach(n=>Object.assign(n,n.layouts[scene]));}
  }
  function project(n) {
    const rotation = scene===2 ? 0 : yaw+rotationX;
    const cos=Math.cos(rotation),sin=Math.sin(rotation);
    const x=n.x*cos+n.z*sin,z=-n.x*sin+n.z*cos;
    const tilt=scene===2?0:-.16+rotationY;
    const y=n.y*Math.cos(tilt)-z*Math.sin(tilt),depth=n.y*Math.sin(tilt)+z*Math.cos(tilt);
    const perspective=3.4/(3.4-depth);
    return {x:camera.x+x*camera.scale*perspective,y:camera.y+y*camera.scale*perspective,depth,scale:perspective};
  }
  function connectors(time) {
    if(scene!==2||width<=1100)return;
    if(interfaceTarget){
      const rect=interfaceTarget.getBoundingClientRect(),endX=rect.left-7,endY=rect.top+Math.min(42,rect.height*.25),startX=camera.x,startY=camera.y;
      if(endY>90&&endY<height-20){
        const color=colors[active>=0?active:0];ctx.strokeStyle=`rgba(${color},.42)`;ctx.lineWidth=.9;
        ctx.beginPath();ctx.moveTo(startX,startY);ctx.bezierCurveTo(startX+45,startY,endX-50,endY,endX,endY);ctx.stroke();
        const t=paused()?1:(time*.4)%1,inv=1-t;
        const x=inv**3*startX+3*inv**2*t*(startX+45)+3*inv*t*t*(endX-50)+t**3*endX,y=inv**3*startY+3*inv**2*t*startY+3*inv*t*t*endY+t**3*endY;
        ctx.beginPath();ctx.fillStyle=`rgba(${color},.95)`;ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.strokeStyle=`rgba(${color},.65)`;ctx.arc(endX,endY,4,0,Math.PI*2);ctx.stroke();
      }
    }
    sections.forEach(section=>{
      const title=section.querySelector('.section-head')||section;
      const rect=title.getBoundingClientRect();
      const y=rect.top+9,x=rect.left-16;
      if(y<100||y>height-25||x<70)return;
      const current=section.id===selectedSection;
      const originX=camera.x,originY=camera.y;
      ctx.strokeStyle=`rgba(142,232,211,${current?.25:.08})`;ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(originX,originY);ctx.bezierCurveTo(originX+30,originY,originX+25,y,x,y);ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,current?3:2,0,Math.PI*2);ctx.fillStyle=current?'#9ce7d4':'#496b68';ctx.fill();
      if(current&&!paused()){
        const t=(time*.15)%1,inv=1-t;
        const px=inv**3*originX+3*inv**2*t*(originX+30)+3*inv*t*t*(originX+25)+t**3*x;
        const py=inv**3*originY+3*inv**2*t*originY+3*inv*t*t*y+t**3*y;
        ctx.beginPath();ctx.fillStyle='#b8f6e6';ctx.arc(px,py,1.8,0,Math.PI*2);ctx.fill();
      }
    });
  }
  function renderWorld(dt=0) {
    if(!ctx)return;
    if(needsGeometry)updateGeometry();
    if(scene===0){ctx.clearRect(0,0,width,height);return;}
    const snap=reduceMotion(),ease=snap?1:1-Math.exp(-Math.max(dt,16)/230);
    camera.x=lerp(camera.x,target.x,ease);camera.y=lerp(camera.y,target.y,ease);
    camera.scale=lerp(camera.scale,target.scale,ease);camera.alpha=lerp(camera.alpha,target.alpha,ease);
    if(!snap&&!dragging){yaw+=dt*(scene===1?.000008:.000035);rotationX=lerp(rotationX,mouseX*.3,.06);rotationY=lerp(rotationY,mouseY*.2,.06);}
    ctx.clearRect(0,0,width,height);
    nodes.forEach((n,i)=>{
      const goal=n.layouts[scene];
      n.x=lerp(n.x,goal.x,ease);n.y=lerp(n.y,goal.y,ease);n.z=lerp(n.z,goal.z,ease);
      projection[i]=project(n);
    });
    const visible=visibleCount(),activity=tuning.activity/100;
    if(!snap&&activity>0&&clock-lastAuto>3.6-activity*2.4){stimulate(Math.floor(rand()*visible),.8+activity*.3);lastAuto=clock;}
    nodes.forEach((n,i)=>{
      const age=clock-n.fireAt;n.charge=!snap&&age>=0&&age<1.7?n.fireStrength*Math.exp(-age*3.4)*activity:0;
      if(cursor.inside&&!snap&&scene===0){
        const p=projection[i],dx=p.x-cursor.x,dy=p.y-cursor.y,d=Math.hypot(dx,dy);
        if(d>0&&d<85){const force=(1-d/85)*5*activity;p.x+=dx/d*force;p.y+=dy/d*force;}
      }
    });
    ctx.globalCompositeOperation='lighter';
    edges.forEach((e,i)=>{
      if(e.a>=visible||e.b>=visible||(!e.backbone&&e.rank>tuning.connections/100))return;
      const p=projection[e.a],q=projection[e.b],n=nodes[e.a],other=nodes[e.b],color=colors[n.group];
      const focus=active===-1||active===n.group,charge=Math.max(n.charge,other.charge);
      const alpha=(.055+(p.depth+.8)*.065+charge*.35)*(focus?1:.26)*camera.alpha;
      const curved=scene!==2;const cx=(p.x+q.x)/2+(e.long?(camera.x-(p.x+q.x)/2)*.7:e.curve*.3),cy=(p.y+q.y)/2+(e.long?-camera.scale*.22:e.curve*.3);
      ctx.strokeStyle=`rgba(${color},${clamp(alpha,0,.6)})`;ctx.lineWidth=(e.long?.9:.45)+charge*.5;
      ctx.beginPath();ctx.moveTo(p.x,p.y);if(curved)ctx.quadraticCurveTo(cx,cy,q.x,q.y);else ctx.lineTo(q.x,q.y);ctx.stroke();
      if(e.long&&curved){
        ctx.strokeStyle=`rgba(${color},${alpha*.28})`;
        for(const offset of [-3,3]){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(cx+offset,cy+offset,q.x,q.y);ctx.stroke();}
      }
      if(e.signal&&focus&&camera.alpha>.25&&activity>0&&!snap){
        const t=(clock*(.12+activity*.17)+e.phase)%1,inv=1-t;
        const x=curved?inv*inv*p.x+2*inv*t*cx+t*t*q.x:lerp(p.x,q.x,t),y=curved?inv*inv*p.y+2*inv*t*cy+t*t*q.y:lerp(p.y,q.y,t);
        const tailT=Math.max(0,t-.05),tailInv=1-tailT;
        const tx=curved?tailInv*tailInv*p.x+2*tailInv*tailT*cx+tailT*tailT*q.x:lerp(p.x,q.x,tailT),ty=curved?tailInv*tailInv*p.y+2*tailInv*tailT*cy+tailT*tailT*q.y:lerp(p.y,q.y,tailT);
        ctx.strokeStyle=`rgba(${color},${camera.alpha*(.25+charge*.45)*activity})`;ctx.lineWidth=1.1;
        ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();
        ctx.beginPath();ctx.fillStyle=`rgba(${color},${camera.alpha*(.45+charge*.4)*activity})`;ctx.arc(x,y,.9+charge,0,Math.PI*2);ctx.fill();
      }
    });
    projection.forEach((p,i)=>{
      if(i>=visible)return;
      const n=nodes[i],color=colors[n.group],focus=active===-1||active===n.group,charge=n.charge;
      const alpha=clamp((.23+(p.depth+.7)*.28+charge*.6)*(focus?1:.4)*camera.alpha,0,1);
      const breath=snap?1:1+Math.sin(clock*1.2+i*.31)*.05*activity;
      const size=n.size*p.scale*(n.hub?1.7:1)*(1+charge*.65)*breath;
      if((n.hub||i%17===0||charge>.6)&&focus&&scene!==2){
        const r=size*(5+charge*5),glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);glow.addColorStop(0,`rgba(${color},${alpha*(.2+charge*.2)})`);glow.addColorStop(1,`rgba(${color},0)`);
        ctx.fillStyle=glow;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);
      }
      if(n.hub&&scene!==2){
        adjacency[i].slice(0,3).forEach((j,k)=>{
          if(j>=visible)return;const q=projection[j],dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1;
          const bx=p.x+dx*.32,by=p.y+dy*.32;
          ctx.strokeStyle=`rgba(${color},${alpha*.45})`;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(bx,by);ctx.lineTo(bx-dy/len*4,by+dx/len*4);ctx.moveTo(bx,by);ctx.lineTo(bx+dy/len*3,by-dx/len*3);ctx.stroke();
        });
      }
      ctx.beginPath();ctx.fillStyle=`rgba(${color},${alpha})`;ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();
      if(charge>.3&&n.hub){ctx.strokeStyle=`rgba(${color},${charge*.5*camera.alpha})`;ctx.lineWidth=.6;ctx.beginPath();ctx.arc(p.x,p.y,size+3+(1-charge)*6,0,Math.PI*2);ctx.stroke();}
    });
    ctx.globalCompositeOperation='source-over';connectors(clock);
  }
  function worldLoop(now){
    if(paused()||document.hidden||document.body.classList.contains('dialog-open')){worldRunning=false;return;}
    if(now-lastFrame>1000/(width<761?28:36)){
      const dt=Math.min(70,now-lastFrame);lastFrame=now;clock+=dt/1000;renderWorld(dt);
    }
    worldFrame=requestAnimationFrame(worldLoop);
  }
  function startWorld(){if(!worldRunning&&!paused()&&!document.hidden&&!document.body.classList.contains('dialog-open')){worldRunning=true;lastFrame=performance.now();worldFrame=requestAnimationFrame(worldLoop);}}
  function wakeWorld(){needsGeometry=true;if(paused()){cancelAnimationFrame(worldFrame);worldRunning=false;renderWorld();}else startWorld();}
  function resizeWorld(){
    width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.75);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);
    needsGeometry=true;updateGeometry();camera={...target};renderWorld();
  }
  addEventListener('resize',resizeWorld,{passive:true});
  let pendingScroll=false;
  addEventListener('scroll',()=>{needsGeometry=true;if(paused()&&!pendingScroll){pendingScroll=true;requestAnimationFrame(()=>{renderWorld();pendingScroll=false;});}},{passive:true});
  addEventListener('luc:motion',wakeWorld);addEventListener('luc:filter',e=>{active=['safety','agents','models'].indexOf(e.detail.topic);wakeWorld();});
  document.addEventListener('toggle',()=>{needsGeometry=true;wakeWorld();},true);
  $$('.network-node').forEach(el=>{
    const enter=()=>{active=Number(el.dataset.network);wakeWorld();};const leave=()=>{active=-1;wakeWorld();};
    el.addEventListener('pointerenter',enter);el.addEventListener('pointerleave',leave);el.addEventListener('focus',enter);el.addEventListener('blur',leave);
  });
  stage.addEventListener('pointermove',e=>{
    if(paused()||e.pointerType==='touch'||dragging||e.target.closest('.network-tuning'))return;
    const r=stage.getBoundingClientRect();mouseX=(e.clientX-r.left)/r.width-.5;mouseY=(e.clientY-r.top)/r.height-.5;
    cursor={x:e.clientX,y:e.clientY,inside:true};
    if(clock-lastHover>.4){
      let nearest=-1,distance=80;projection.slice(0,visibleCount()).forEach((p,i)=>{const d=Math.hypot(p.x-e.clientX,p.y-e.clientY);if(d<distance){nearest=i;distance=d;}});
      if(nearest>=0){stimulate(nearest,1.4);lastHover=clock;}
    }
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{mouseX=mouseY=0;cursor.inside=false;});
  let lastDragX=0;
  stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.target.closest('a,button,input,label,.network-tuning')||paused())return;dragging=true;lastDragX=e.clientX;stage.setPointerCapture(e.pointerId);});
  stage.addEventListener('pointermove',e=>{if(dragging){yaw+=(e.clientX-lastDragX)*.006;lastDragX=e.clientX;}},{passive:true});
  const endDrag=()=>{dragging=false;};stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);stage.addEventListener('lostpointercapture',endDrag);
  $$('.work-item, .timeline-item').forEach(item=>{
    const activate=()=>{
      interfaceTarget=item;
      const topic=(item.dataset.topics||item.id);active=topic.includes('agents')||topic.includes('orange')||topic.includes('infologic')?1:topic.includes('models')||topic.includes('eric')?2:0;
      item.classList.add('neural-linked');const choices=nodes.map((n,i)=>({n,i})).filter(({n,i})=>i<visibleCount()&&n.group===active);
      if(choices.length)stimulate(choices[Math.floor(rand()*choices.length)].i,1.2);wakeWorld();
    };
    const deactivate=()=>{interfaceTarget=null;active=-1;item.classList.remove('neural-linked');wakeWorld();};
    item.addEventListener('pointerenter',activate);item.addEventListener('pointerleave',deactivate);item.addEventListener('focusin',activate);item.addEventListener('focusout',e=>{if(!item.contains(e.relatedTarget))deactivate();});
  });
  if(ctx){resizeWorld();startWorld();}

  // The page graph and publication viewer are owned by knowledge.js.
})();
