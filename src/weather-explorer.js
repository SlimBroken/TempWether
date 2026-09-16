import {MODELS,LOCATIONS,finite,formatTime} from './weather.js';
import {GRID,fetchField,sampleField,sampleAt} from './weather-field.js';
import {icon} from './icons.js';

const saved={model:MODELS[0].id,layer:'storm',hour:0,point:[34.7818,32.0853],bounds:null};
const region={west:20,east:38,south:28,north:41};
const value=(n,d=0)=>finite(n)?n.toFixed(d):'—';
const stamp=t=>formatTime(t,{weekday:'short',day:'numeric',month:'short'});
const palettes={rain:[[0,[35,65,86]],[.1,[39,125,176]],[1,[46,189,196]],[3,[108,205,146]],[6,[243,202,101]],[10,[247,118,97]],[20,[209,106,221]]],wind:[[0,[30,55,90]],[10,[45,113,163]],[25,[42,177,167]],[40,[189,207,108]],[60,[241,157,91]],[90,[190,101,200]]]};
export function weatherColor(n,layer){
 if(!finite(n))return [0,0,0,0];
 const stops=palettes[layer==='wind'?'wind':'rain'];
 const index=stops.findIndex(s=>s[0]>=n);
 if(index===0)return [...stops[0][1],255];
 if(index<0)return [...stops.at(-1)[1],255];
 const a=stops[index-1],b=stops[index],t=(n-a[0])/(b[0]-a[0]);
 return [...a[1].map((v,i)=>Math.round(v+(b[1][i]-v)*t)),255];
}

export function mountWeatherExplorer(root,{geo,sample=false}){
 const q=s=>root.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let disposed=false,field=null,request=0,hour=saved.hour,model=saved.model,layer=saved.layer;
 let bounds={...(saved.bounds||region)},point=[...saved.point],motion=!reduced.matches,playing=false;
 let width=900,height=540,frame=0,last=0,tick=0,particles=[],drag=null,loading=false;
 root.innerHTML=`<section class="panel weather-explorer"><div class="explorer-heading"><div><span class="eyebrow">THE ATMOSPHERE, IN MOTION</span><h2>Storm & wind explorer</h2><p>Follow the bigger picture from Greece to Israel.</p></div><span class="explorer-badge">${sample?'SYNTHETIC PREVIEW':'MODEL FORECAST · NOT RADAR'}</span></div>
 <div class="explorer-toolbar"><div class="segmented" aria-label="Animated weather layer">${[['storm','Storm outlook'],['wind','Wind'],['rain','Rain / snow']].map(([key,label])=>`<button data-flow-layer="${key}" aria-pressed="${layer===key}" class="${layer===key?'active':''}">${label}</button>`).join('')}</div><label class="explorer-select">Model<select id="flow-model" aria-label="Animated map model">${MODELS.map(m=>`<option value="${m.id}" ${m.id===model?'selected':''}>${m.name}</option>`).join('')}</select></label><button class="button" id="flow-motion" aria-pressed="${motion}">${icon('wind')} <span>Wind motion ${motion?'on':'off'}</span></button></div>
 <div class="flow-stage"><canvas class="flow-base" role="img" aria-label="Forecast weather map. Use the location picker or click the map to inspect values."></canvas><canvas class="flow-particles" aria-hidden="true"></canvas><div class="flow-map-title"><span>EASTERN MEDITERRANEAN</span><strong id="flow-time">Loading forecast grid…</strong></div><div class="flow-map-tools"><button id="flow-plus" aria-label="Zoom in">+</button><button id="flow-minus" aria-label="Zoom out">−</button><button id="flow-israel">Israel</button><button id="flow-region">Region</button></div><div class="flow-status" role="status"></div><div class="flow-map-hint">Drag to pan · Click to inspect · N ↑</div></div>
 <div class="flow-legend"></div><div class="flow-timeline"><button class="button primary" id="flow-play" aria-label="Play forecast timeline" disabled>${icon('play')} Play</button><div><label for="flow-hour">Forecast hour <strong id="flow-hour-label">—</strong></label><input id="flow-hour" type="range" min="0" max="167" value="${hour}" aria-label="Animated forecast hour" disabled><div class="flow-time-ends"><span id="flow-start">—</span><span id="flow-end">—</span></div></div><button class="button" id="flow-now">Now</button></div>
 <div class="flow-inspector"><div><label class="explorer-select">Inspect location<select id="flow-location"><option value="custom">Map selection</option>${LOCATIONS.map(l=>`<option value="${l.id}">${l.name}</option>`).join('')}</select></label><span id="flow-coordinates"></span></div><div id="flow-values" aria-live="polite"></div></div>
 <div class="flow-disclaimer"><strong>Forecast visualization, not an official storm warning.</strong> Colours are interpolated from a coarse 9 × 7 display grid (~2°), not native model pixels. Wind trails show forecast direction; animation speed is illustrative. Rain / snow is the preceding hour’s precipitation, not a daily total. Clouds are model cloud cover, not satellite imagery. Use city forecasts below for local detail. <span id="flow-source"></span></div></section>`;
 const base=q('.flow-base'),canvas=q('.flow-particles'),ctx=base.getContext('2d'),wind=canvas.getContext('2d');
 const raster=document.createElement('canvas');raster.width=144;raster.height=96;const rc=raster.getContext('2d');
 const project=(lon,lat)=>[(lon-bounds.west)/(bounds.east-bounds.west)*width,(bounds.north-lat)/(bounds.north-bounds.south)*height];
 const unproject=(x,y)=>[bounds.west+x/width*(bounds.east-bounds.west),bounds.north-y/height*(bounds.north-bounds.south)];
 const updateSaved=()=>Object.assign(saved,{model,layer,hour,point:[...point],bounds:{...bounds}});
 const clearWind=()=>{wind.clearRect(0,0,width,height);particles=[];};
 function polygon(f,fill){
  const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  ctx.beginPath();for(const poly of polys)for(const ring of poly){ring.forEach(([lon,lat],i)=>{const [x,y]=project(lon,lat);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();}
  if(fill){ctx.fillStyle=f.id==='ISR'?'#26404a':'#20323e';ctx.fill('evenodd');}
  ctx.strokeStyle='#69869380';ctx.lineWidth=.8;ctx.stroke();
 }
 function paint(){
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#0d2232';ctx.fillRect(0,0,width,height);
  for(const f of geo?.features||[])polygon(f,true);
  if(field){
   const img=rc.createImageData(raster.width,raster.height);
   for(let y=0;y<raster.height;y++)for(let x=0;x<raster.width;x++){
    const [lon,lat]=unproject(x/raster.width*width,y/raster.height*height),s=sampleAt(field,hour,lon,lat),i=(y*raster.width+x)*4;
    if(!s)continue;
    let color=weatherColor(layer==='wind'?s.wind:s.rain,layer),alpha=layer==='wind'?.63:finite(s.rain)?Math.min(.82,s.rain*.25):0;
    if(layer==='storm'&&finite(s.cloud)){
     const cloudAlpha=s.cloud/100*.29;
     if(alpha<cloudAlpha){color=[176,201,215,255];alpha=cloudAlpha;}
    }
    img.data.set([color[0],color[1],color[2],color[3]*alpha],i);
   }
   rc.putImageData(img,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,0,0,width,height);
   for(const f of geo?.features||[])polygon(f,false);
   // Static direction arrows remain visible with animation disabled.
   ctx.strokeStyle='#daf3ea85';ctx.lineWidth=1;
   for(let y=35;y<height;y+=47)for(let x=30;x<width;x+=55){
    const [lon,lat]=unproject(x,y),s=sampleAt(field,hour,lon,lat);if(!s||!finite(s.wind)||s.wind<1)continue;
    const aspect=(width/(bounds.east-bounds.west))/(height/(bounds.north-bounds.south));
    const a=Math.atan2(-s.v,s.u/Math.cos(lat*Math.PI/180)*aspect),len=7+Math.min(s.wind,80)/10;
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(len/2,0);ctx.lineTo(len/2-3,-2.5);ctx.moveTo(len/2,0);ctx.lineTo(len/2-3,2.5);ctx.stroke();ctx.restore();
   }
  }
  ctx.textAlign='center';ctx.font='600 12px system-ui';
  for(const [name,lon,lat] of [['GREECE',23.4,39.2],['TÜRKIYE',32.2,38.3],['CYPRUS',33.1,35.7],['ISRAEL',35.2,30.5],['EGYPT',29.2,29.6]]){
   const [x,y]=project(lon,lat);ctx.strokeStyle='#0d2232';ctx.lineWidth=4;ctx.strokeText(name,x,y);ctx.fillStyle='#adc1cc';ctx.fillText(name,x,y);
  }
  ctx.font='11px system-ui';
  for(const id of ['athens','crete','rhodes','paphos','tel-aviv','haifa','jerusalem']){
   const l=LOCATIONS.find(l=>l.id===id),[x,y]=project(l.lon,l.lat);
   ctx.fillStyle='#f0f8f8';ctx.beginPath();ctx.arc(x,y,2.3,0,Math.PI*2);ctx.fill();ctx.textAlign='right';ctx.lineWidth=3;ctx.strokeStyle='#0c1d29';ctx.strokeText(l.name,x-7,y-5);ctx.fillText(l.name,x-7,y-5);
  }
  const [px,py]=project(...point);ctx.strokeStyle='#e0ff9c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(px-13,py);ctx.lineTo(px+13,py);ctx.moveTo(px,py-13);ctx.lineTo(px,py+13);ctx.stroke();
  clearWind();updateSaved();
 }
 function inspector(){
  const s=sampleAt(field,hour,...point);
  q('#flow-coordinates').textContent=`${point[1].toFixed(2)}° N, ${point[0].toFixed(2)}° E · interpolated`;
  q('#flow-values').innerHTML=[['Wind',`${value(s?.wind)} km/h`],['From',`${value(s?.direction)}°`],['Peak gust',`${value(s?.gust)} km/h`],['Rain / snow',`${value(s?.rain,1)} mm`],['Cloud',`${value(s?.cloud)}%`],['Pressure',`${value(s?.pressure)} hPa`]].map(([label,v])=>`<div><span>${label}</span><strong>${v}</strong></div>`).join('');
 }
 function timeChanged(){
  if(!field)return;hour=Math.max(0,Math.min(hour,field.times.length-1));
  q('#flow-hour').value=hour;q('#flow-hour-label').textContent=stamp(field.times[hour]);q('#flow-time').textContent=`${MODELS.find(m=>m.id===model).name} · ${stamp(field.times[hour])}`;
  inspector();paint();
 }
 function legend(){
  const labels=layer==='wind'?['0','10','25','40','60','90+ km/h']:['0','.1','1','3','6','10','20+ mm'];
  q('.flow-legend').innerHTML=`<strong>${layer==='wind'?'Wind speed at 10 m':'Preceding-hour precipitation'}</strong><div><div class="flow-gradient ${layer==='wind'?'wind-gradient':''}"></div><div class="flow-legend-labels">${labels.map(l=>`<span>${l}</span>`).join('')}</div></div><span>${layer==='storm'?'Pale shading: clouds · arrows: wind':'Arrows: wind direction'} · Unavailable: unshaded</span>`;
 }
 function playback(on){playing=on;q('#flow-play').innerHTML=on?'Ⅱ Pause':`${icon('play')} Play`;q('#flow-play').setAttribute('aria-label',on?'Pause forecast timeline':'Play forecast timeline');tick=performance.now();}
 function animate(now){
  if(disposed)return;
  const dt=Math.min((now-last)/16.67,3);last=now;
  if(field&&!document.hidden){
   if(playing&&now-tick>650){if(hour>=field.times.length-1)playback(false);else{hour++;timeChanged();}tick=now;}
   if(motion){
    wind.globalCompositeOperation='destination-in';wind.fillStyle='rgba(0,0,0,.93)';wind.fillRect(0,0,width,height);wind.globalCompositeOperation='source-over';
    const count=Math.min(520,Math.round(width*height/1200));
    while(particles.length<count)particles.push({x:Math.random()*width,y:Math.random()*height,age:Math.random()*80});
    wind.strokeStyle='#e0fff5aa';wind.lineWidth=1;wind.beginPath();
    for(const p of particles){
     const [lon,lat]=unproject(p.x,p.y),s=sampleAt(field,hour,lon,lat);
     if(!s||!finite(s.wind)||s.wind<.3||p.age>100||p.x<0||p.x>width||p.y<0||p.y>height){p.x=Math.random()*width;p.y=Math.random()*height;p.age=0;continue;}
     const aspect=(width/(bounds.east-bounds.west))/(height/(bounds.north-bounds.south));
     wind.moveTo(p.x,p.y);p.x+=s.u/Math.cos(lat*Math.PI/180)*aspect*.018*dt;p.y-=s.v*.018*dt;wind.lineTo(p.x,p.y);p.age+=dt;
    }wind.stroke();
   }
  }
  // No idle animation loop with reduced motion, paused timeline, or hidden tab.
  frame=(motion||playing)&&!document.hidden?requestAnimationFrame(animate):0;
 }
 function startFrames(){if(!frame&&!disposed&&(motion||playing)&&!document.hidden){last=performance.now();frame=requestAnimationFrame(animate);}}
 function resize(){
  const rect=q('.flow-stage').getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);
  for(const c of [base,canvas]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}paint();
 }
 function setBounds(next){bounds=next;paint();}
 function zoom(factor){
  const cx=(bounds.east+bounds.west)/2,cy=(bounds.north+bounds.south)/2,w=Math.min(18,Math.max(2,(bounds.east-bounds.west)*factor)),h=Math.min(13,Math.max(2,(bounds.north-bounds.south)*factor));
  const west=Math.max(GRID.west,Math.min(GRID.east-w,cx-w/2)),south=Math.max(GRID.south,Math.min(GRID.north-h,cy-h/2));setBounds({west,east:west+w,south,north:south+h});
 }
 async function load(){
  const id=++request,wantedTime=field?.times[hour];loading=true;field=null;playback(false);paint();inspector();
  q('.flow-status').hidden=false;q('.flow-status').textContent=`Loading ${MODELS.find(m=>m.id===model).name} regional grid…`;
  q('#flow-source').textContent='';q('#flow-time').textContent='Loading forecast grid…';q('#flow-hour').disabled=true;q('#flow-play').disabled=true;
  try{
   const result=sample?sampleField(model):await fetchField(model);if(disposed||id!==request)return;
   field=result;loading=false;if(wantedTime){const index=field.times.indexOf(wantedTime);hour=index<0?0:index;}
   hour=Math.min(hour,field.times.length-1);q('.flow-status').hidden=true;q('#flow-hour').max=field.times.length-1;q('#flow-hour').disabled=false;q('#flow-play').disabled=false;
   q('#flow-start').textContent=stamp(field.times[0]);q('#flow-end').textContent=stamp(field.times.at(-1));
   q('#flow-source').textContent=`${sample?'Synthetic sample; not current weather.':'Source: Open-Meteo · '+MODELS.find(m=>m.id===model).name+'.'} Grid fetched ${stamp(field.fetchedAt/1000)} · times in Israel timezone.`;
   timeChanged();startFrames();
  }catch(e){if(disposed||id!==request)return;loading=false;q('.flow-status').replaceChildren(document.createTextNode(`Regional graphics unavailable. ${e.message} `));const retry=document.createElement('button');retry.className='button';retry.textContent='Retry map';retry.onclick=load;q('.flow-status').append(retry);q('#flow-time').textContent='No regional grid loaded';}
 }
 q('#flow-model').onchange=e=>{model=e.target.value;updateSaved();load();};
 root.querySelectorAll('[data-flow-layer]').forEach(b=>b.onclick=()=>{layer=b.dataset.flowLayer;root.querySelectorAll('[data-flow-layer]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',el===b);});legend();paint();});
 q('#flow-hour').oninput=e=>{playback(false);hour=Number(e.target.value);timeChanged();};
 q('#flow-play').onclick=()=>{if(hour===field.times.length-1)hour=0;playback(!playing);timeChanged();startFrames();};
 q('#flow-now').onclick=()=>{playback(false);if(field){const i=field.times.findIndex(t=>t>=Date.now()/1000-3600);hour=Math.max(0,i);timeChanged();}};
 const motionLabel=()=>{q('#flow-motion').setAttribute('aria-pressed',motion);q('#flow-motion span').textContent=`Wind motion ${motion?'on':'off'}`;};
 q('#flow-motion').onclick=()=>{motion=!motion;motionLabel();clearWind();startFrames();};
 const reduce=()=>{if(reduced.matches){motion=false;playback(false);motionLabel();clearWind();}};reduced.addEventListener('change',reduce);
 q('#flow-plus').onclick=()=>zoom(.7);q('#flow-minus').onclick=()=>zoom(1.4);
 q('#flow-israel').onclick=()=>setBounds({west:32.2,east:37.4,south:29,north:35.6});q('#flow-region').onclick=()=>setBounds({...region});
 q('#flow-location').onchange=e=>{const loc=LOCATIONS.find(l=>l.id===e.target.value);if(loc){point=[loc.lon,loc.lat];inspector();paint();}};
 base.onpointerdown=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,bounds:{...bounds},moved:false};base.setPointerCapture(e.pointerId);};
 base.onpointermove=e=>{
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<5&&!drag.moved)return;drag.moved=true;
  const b=drag.bounds,w=b.east-b.west,h=b.north-b.south,west=Math.max(GRID.west,Math.min(GRID.east-w,b.west-dx/width*w)),south=Math.max(GRID.south,Math.min(GRID.north-h,b.south+dy/height*h));setBounds({west,east:west+w,south,north:south+h});
 };
 base.onpointerup=e=>{if(!drag)return;if(!drag.moved){const rect=base.getBoundingClientRect();point=unproject(e.clientX-rect.left,e.clientY-rect.top);q('#flow-location').value='custom';inspector();paint();}drag=null;};
 base.onpointercancel=()=>{drag=null;};
 const visibility=()=>{if(document.hidden){playback(false);if(frame)cancelAnimationFrame(frame);frame=0;}else startFrames();};document.addEventListener('visibilitychange',visibility);
 const observer=new ResizeObserver(resize);observer.observe(q('.flow-stage'));legend();inspector();resize();load();
 return ()=>{disposed=true;request++;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reduce);updateSaved();};
}
