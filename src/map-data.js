import {blend,daily,finite} from './weather.js';

export const MAP_LAYERS={
 high:{label:'Temperature',description:'Daily high temperature',unit:'°C',digits:1,bands:[{below:15,color:'#82b9ff',label:'<15°'},{below:25,color:'#c9f479',label:'15–25°'},{below:35,color:'#f9c575',label:'25–35°'},{below:Infinity,color:'#f08b83',label:'≥35°'}]},
 rain:{label:'Rainfall',description:'Daily rainfall total',unit:'mm',digits:1,bands:[{below:1,color:'#95a8b8',label:'<1 mm'},{below:15,color:'#74c9f4',label:'1–15 mm'},{below:40,color:'#bda2f5',label:'15–40 mm'},{below:Infinity,color:'#ee9dc1',label:'≥40 mm'}]},
 gust:{label:'Gusts',description:'Peak hourly gust forecast',unit:'km/h',digits:0,bands:[{below:40,color:'#74c9f4',label:'<40'},{below:60,color:'#e2dc93',label:'40–60'},{below:80,color:'#f9bc76',label:'60–80'},{below:Infinity,color:'#f08b83',label:'≥80'}]},
};

// An unavailable selected model stays unavailable. Never substitute a blend.
export function forecastDay(data,date,model='blend'){
 const rows=model==='blend'?blend(data?.models||{}):data?.models?.[model]||[];
 return daily(rows).find(d=>d.date===date);
}
export function mapColor(value,layer){
 if(!finite(value))return '#667583';
 return MAP_LAYERS[layer].bands.find(b=>value<b.below)?.color||'#667583';
}
