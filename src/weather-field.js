import {MODELS,finite,requestJSON} from './weather.js';

// A deliberately coarse display grid, NOT native model resolution or radar.
export const GRID={west:20,east:38,south:28,north:41,cols:9,rows:7};
export const GRID_POINTS=Array.from({length:GRID.cols*GRID.rows},(_,i)=>({
 lon:GRID.west+(i%GRID.cols)*(GRID.east-GRID.west)/(GRID.cols-1),
 lat:GRID.north-Math.floor(i/GRID.cols)*(GRID.north-GRID.south)/(GRID.rows-1),
}));
export const FIELD_KEYS=['u','v','rain','gust','cloud','pressure'];
const cache=new Map(),pending=new Map();
export function windVector(speed,direction){
 if(!finite(speed)||speed<0||!finite(direction))return [null,null];
 const radians=direction*Math.PI/180;
 // Meteorological direction is FROM; vectors point TO, east/north positive.
 return [-speed*Math.sin(radians),-speed*Math.cos(radians)];
}
export function fieldURL(model){
 if(!MODELS.some(m=>m.id===model))throw Error('Unknown weather model');
 const params=new URLSearchParams({latitude:GRID_POINTS.map(p=>p.lat.toFixed(4)).join(','),longitude:GRID_POINTS.map(p=>p.lon.toFixed(4)).join(','),models:model,forecast_hours:'168',timeformat:'unixtime',timezone:'Asia/Jerusalem',wind_speed_unit:'kmh',precipitation_unit:'mm',cell_selection:'nearest',hourly:'wind_speed_10m,wind_direction_10m,precipitation,wind_gusts_10m,cloud_cover,pressure_msl'});
 return `https://api.open-meteo.com/v1/forecast?${params}`;
}
export function normalizeField(raw,model){
 if(!Array.isArray(raw)||raw.length!==GRID_POINTS.length)throw Error('Incomplete regional grid response');
 const times=[...new Set(raw.flatMap(r=>r.hourly?.time||[]))].filter(finite).sort((a,b)=>a-b);
 if(!times.length)throw Error('Regional forecast has no valid hours');
 const cells=raw.map((r,i)=>{
  const h=r.hourly||{},indices=new Map((h.time||[]).map((t,j)=>[t,j]));
  const values=times.map(t=>{
   const j=indices.get(t),get=key=>finite(h[key]?.[j])?h[key][j]:null;
   return [...windVector(get('wind_speed_10m'),get('wind_direction_10m')),get('precipitation'),get('wind_gusts_10m'),get('cloud_cover'),get('pressure_msl')];
  });
  return {...GRID_POINTS[i],values};
 });
 if(!cells.some(c=>c.values.some(v=>v.some(finite))))throw Error('Regional model is unavailable');
 return {model,fetchedAt:Date.now(),times,cells,sample:false};
}
export async function fetchField(model){
 const previous=cache.get(model);
 if(previous&&Date.now()-previous.fetchedAt<30*60*1000)return previous;
 if(pending.has(model))return pending.get(model);
 const task=requestJSON(fieldURL(model),30000).then(raw=>{
  const data=normalizeField(raw,model);cache.set(model,data);return data;
 }).finally(()=>pending.delete(model));
 pending.set(model,task);return task;
}
export function sampleField(model,now=Date.now()){
 const offset=MODELS.findIndex(m=>m.id===model)*.55;
 const times=Array.from({length:168},(_,i)=>Math.floor(now/3600000)*3600+i*3600);
 return {model,sample:true,fetchedAt:now,times,cells:GRID_POINTS.map(p=>({...p,values:times.map((_,h)=>{
  const cx=24+h*.068+offset,cy=36-h*.014;
  const dx=(p.lon-cx)*.85,dy=p.lat-cy,r=Math.hypot(dx,dy);
  const strength=Math.exp(-r*r/15),speed=12+strength*44;
  const direction=(Math.atan2(dy,dx)*180/Math.PI+180+360)%360;
  return [...windVector(speed,direction),Math.max(0,8*strength-.4),speed*1.48,Math.min(100,20+strength*85),1019-strength*24];
 })}))};
}
export function sampleAt(field,hour,lon,lat){
 if(!field||lon<GRID.west||lon>GRID.east||lat<GRID.south||lat>GRID.north)return null;
 const x=(lon-GRID.west)/(GRID.east-GRID.west)*(GRID.cols-1),y=(GRID.north-lat)/(GRID.north-GRID.south)*(GRID.rows-1);
 const col=Math.min(GRID.cols-2,Math.floor(x)),row=Math.min(GRID.rows-2,Math.floor(y)),fx=x-col,fy=y-row;
 const corners=[[row*GRID.cols+col,(1-fx)*(1-fy)],[row*GRID.cols+col+1,fx*(1-fy)],[(row+1)*GRID.cols+col,(1-fx)*fy],[(row+1)*GRID.cols+col+1,fx*fy]].filter(([,w])=>w>1e-9);
 const values=FIELD_KEYS.map((_,k)=>corners.every(([i])=>finite(field.cells[i]?.values[hour]?.[k]))?corners.reduce((s,[i,w])=>s+field.cells[i].values[hour][k]*w,0):null);
 const result=Object.fromEntries(FIELD_KEYS.map((key,i)=>[key,values[i]]));
 result.wind=finite(result.u)&&finite(result.v)?Math.hypot(result.u,result.v):null;
 result.direction=finite(result.wind)&&result.wind>.01?(Math.atan2(-result.u,-result.v)*180/Math.PI+360)%360:null;
 return result;
}
