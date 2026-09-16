export const MODELS = [
  { id: 'ecmwf_ifs025', name: 'ECMWF', detail: 'IFS · Europe', color: '#c9f479' },
  { id: 'gfs_global', name: 'GFS', detail: 'NOAA · United States', color: '#74c9f4' },
  { id: 'icon_global', name: 'ICON', detail: 'DWD · Germany', color: '#c4a2f9' },
];
export const LOCATIONS = [
  { id:'tel-aviv', name:'Tel Aviv', hebrew:'תל אביב', country:'Israel', lat:32.0853, lon:34.7818 },
  { id:'jerusalem', name:'Jerusalem', hebrew:'ירושלים', country:'Israel', lat:31.7683, lon:35.2137 },
  { id:'haifa', name:'Haifa', hebrew:'חיפה', country:'Israel', lat:32.794, lon:34.9896 },
  { id:'beer-sheva', name:'Be’er Sheva', hebrew:'באר שבע', country:'Israel', lat:31.252, lon:34.7915 },
  { id:'eilat', name:'Eilat', hebrew:'אילת', country:'Israel', lat:29.5577, lon:34.9519 },
  { id:'safed', name:'Safed', hebrew:'צפת', country:'Israel', lat:32.9656, lon:35.4983 },
  { id:'tiberias', name:'Tiberias', hebrew:'טבריה', country:'Israel', lat:32.7959, lon:35.5312 },
  { id:'ashdod', name:'Ashdod', hebrew:'אשדוד', country:'Israel', lat:31.8044, lon:34.6553 },
  { id:'athens', name:'Athens', country:'Greece', lat:37.9838, lon:23.7275 },
  { id:'crete', name:'Heraklion', country:'Greece', lat:35.3387, lon:25.1442 },
  { id:'rhodes', name:'Rhodes', country:'Greece', lat:36.434, lon:28.2176 },
  { id:'paphos', name:'Paphos', country:'Cyprus', lat:34.7754, lon:32.4245 },
  { id:'larnaca', name:'Larnaca', country:'Cyprus', lat:34.9003, lon:33.6232 },
  { id:'nicosia', name:'Nicosia', country:'Cyprus', lat:35.1856, lon:33.3823 },
];
export const TZ = 'Asia/Jerusalem';
export const HOUR = 3600;
export const finite = v => typeof v === 'number' && Number.isFinite(v);
export const mean = values => { const a=values.filter(finite); return a.length ? a.reduce((s,v)=>s+v,0)/a.length : null; };
export const min = values => { const a=values.filter(finite); return a.length ? Math.min(...a) : null; };
export const max = values => { const a=values.filter(finite); return a.length ? Math.max(...a) : null; };
export const sum = values => { const a=values.filter(finite); return a.length ? a.reduce((s,v)=>s+v,0) : null; };
export const localDate = seconds => new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(seconds*1000));
export const formatTime = (seconds,opts={}) => new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',...opts}).format(new Date(seconds*1000));
export const formatDay = (date,opts={}) => new Intl.DateTimeFormat('en-GB',{weekday:'short',...opts,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
export function condition(code) {
  if (!finite(code)) return {label:'Conditions unavailable',icon:'cloud'};
  if(code===0) return {label:'Clear sky',icon:'sun'};
  if(code<=2) return {label:'Partly cloudy',icon:'cloud-sun'};
  if(code===3) return {label:'Overcast',icon:'cloud'};
  if(code<=48) return {label:'Fog',icon:'haze'};
  if(code>=95) return {label:'Thunderstorms',icon:'cloud-lightning'};
  if((code>=71&&code<=77)||code===85||code===86) return {label:'Snow',icon:'snowflake'};
  return {label:'Rain',icon:'cloud-rain'};
}
export function field(raw, key, model) { return raw?.hourly?.[key] ?? raw?.hourly?.[`${key}_${model}`] ?? []; }
export function normalize(raw,model) {
  if(!raw?.hourly?.time?.length) throw Error('The provider returned no hourly forecast.');
  const names={temp:'temperature_2m',rain:'precipitation',wind:'wind_speed_10m',gust:'wind_gusts_10m',pressure:'pressure_msl',code:'weather_code',humidity:'relative_humidity_2m',feels:'apparent_temperature',probability:'precipitation_probability'};
  return raw.hourly.time.map((time,i)=>Object.fromEntries([['time',time],...Object.entries(names).map(([k,v])=>[k,finite(field(raw,v,model)[i])?field(raw,v,model)[i]:null])]));
}
export function blend(models) {
  const times=[...new Set(Object.values(models).flatMap(rows=>rows.map(r=>r.time)))].sort((a,b)=>a-b);
  const maps=Object.values(models).map(rows=>new Map(rows.map(r=>[r.time,r])));
  return times.map(time=>{
    const rows=maps.map(m=>m.get(time)).filter(Boolean),temps=rows.map(r=>r.temp).filter(finite);
    const codeRows=rows.map(r=>r.code).filter(finite),counts=new Map();
    codeRows.forEach(c=>counts.set(c,(counts.get(c)||0)+1));
    return {time,...Object.fromEntries(['temp','rain','wind','gust','pressure'].map(k=>[k,mean(rows.map(r=>r[k]))])),code:[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??null,low:min(temps),high:max(temps),members:temps.length};
  });
}
export function daily(rows) {
  const grouped=new Map();
  for(const row of rows) {const d=localDate(row.time); if(!grouped.has(d)) grouped.set(d,[]);grouped.get(d).push(row);}
  return [...grouped].map(([date,hours])=>({date,high:max(hours.map(r=>r.temp)),low:min(hours.map(r=>r.temp)),rain:sum(hours.map(r=>r.rain)),gust:max(hours.map(r=>r.gust)),wind:max(hours.map(r=>r.wind)),spread:mean(hours.map(r=>finite(r.low)&&finite(r.high)?r.high-r.low:null)),members:min(hours.map(r=>r.members)),code:hours.find(r=>formatTime(r.time)==='12:00')?.code??hours[0].code,hours:hours.length,rainHours:hours.filter(r=>finite(r.rain)).length}));
}
export function locationView(data) {
  const hours=blend(data.models||{});
  return {...data,hours,days:daily(hours)};
}
export function modelSignal(day) {
  if(!day || (!finite(day.rain)&&!finite(day.gust))) return {level:'unknown',label:'Data unavailable'};
  if((day.rain??0)>=40||(day.gust??0)>=80) return {level:'high',label:'Strong signal'};
  if((day.rain??0)>=15||(day.gust??0)>=60) return {level:'watch',label:'Worth watching'};
  return {level:'low',label:'Below watch thresholds'};
}
export async function requestJSON(url,timeout=22000) {
  const response=await fetch(url,{signal:AbortSignal.timeout(timeout)});
  if(!response.ok) throw Error(response.status===429?'Weather provider rate limit reached. Please retry later.':`Weather provider returned HTTP ${response.status}.`);
  const body=await response.json(); if(body.error) throw Error(body.reason||'Weather request failed.'); return body;
}
export function forecastURL(locations,model) {
  const supplemental=model==='best_match';
  const query=new URLSearchParams({latitude:locations.map(l=>l.lat).join(','),longitude:locations.map(l=>l.lon).join(','),hourly:supplemental?'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code':'temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,pressure_msl,weather_code',models:model,forecast_days:'7',timezone:TZ,timeformat:'unixtime',wind_speed_unit:'kmh',precipitation_unit:'mm',temperature_unit:'celsius'});
  return `https://api.open-meteo.com/v1/forecast?${query}`;
}
export async function fetchForecasts(locations=LOCATIONS) {
  const requests=[...MODELS.map(m=>m.id),'best_match'];
  const responses=await Promise.allSettled(requests.map(m=>requestJSON(forecastURL(locations,m))));
  const result={version:1,fetchedAt:new Date().toISOString(),locations:{},errors:[]};
  locations.forEach(l=>result.locations[l.id]={models:{},supplemental:[]});
  responses.forEach((res,i)=>{
    if(res.status==='rejected'){result.errors.push(`${requests[i]}: ${res.reason.message}`);return;}
    const records=Array.isArray(res.value)?res.value:[res.value];
    records.forEach((raw,j)=>{
      if(!locations[j]) return;
      try {const rows=normalize(raw,requests[i]); if(requests[i]==='best_match') result.locations[locations[j].id].supplemental=rows; else result.locations[locations[j].id].models[requests[i]]=rows;}
      catch(e){result.errors.push(`${requests[i]} / ${locations[j].name}: ${e.message}`);}
    });
  });
  if(!Object.values(result.locations).some(l=>Object.keys(l.models).length)) throw Error('Unable to reach the forecast providers. Check your connection and try again.');
  return result;
}
export function summarizeScan(data) {
  return {at:data.fetchedAt,locations:Object.fromEntries(Object.entries(data.locations).map(([id,l])=>[id,{days:daily(blend(l.models)),models:Object.fromEntries(Object.entries(l.models).map(([m,rows])=>[m,daily(rows)]))}]))};
}
export function mergeScans(...groups) {
  return [...new Map(groups.flat().filter(s=>s?.at&&s?.locations).map(s=>[s.at,s])).values()].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,240);
}
export function temperatureScore(predictions,reference) {
  const actual=new Map(reference.map(r=>[r.time,r.temp]));
  const errors=predictions.filter(p=>finite(p.temp)&&finite(actual.get(p.time))).map(p=>p.temp-actual.get(p.time));
  return {count:errors.length,mae:mean(errors.map(Math.abs)),bias:mean(errors),rmse:errors.length?Math.sqrt(mean(errors.map(e=>e*e))):null};
}
export async function fetchBenchmark(location) {
  const end=new Date();end.setUTCDate(end.getUTCDate()-7);
  const start=new Date(end);start.setUTCDate(start.getUTCDate()-13);
  const dates={start_date:start.toISOString().slice(0,10),end_date:end.toISOString().slice(0,10)};
  const base={latitude:String(location.lat),longitude:String(location.lon),...dates,timezone:TZ,timeformat:'unixtime'};
  const responses=await Promise.allSettled(MODELS.map(m=>requestJSON('https://previous-runs-api.open-meteo.com/v1/forecast?'+new URLSearchParams({...base,models:m.id,hourly:'temperature_2m_previous_day1,temperature_2m_previous_day3,temperature_2m_previous_day7'}),35000)));
  const rawRef=await requestJSON('https://archive-api.open-meteo.com/v1/archive?'+new URLSearchParams({...base,models:'era5',hourly:'temperature_2m'}),35000);
  const ref=normalize(rawRef,'era5');
  // A fair leaderboard must use identical timestamps for all three models at each lead time.
  const scores={};
  for(const lead of [1,3,7]) {
    const entries=responses.map((r,i)=>({id:MODELS[i].id,rows:r.status==='fulfilled'?(r.value.hourly?.time||[]).map((time,j)=>({time,temp:field(r.value,`temperature_2m_previous_day${lead}`,MODELS[i].id)[j]})):[]}));
    const available=entries.filter(e=>e.rows.some(r=>finite(r.temp)));
    const validSets=available.map(e=>new Set(e.rows.filter(r=>finite(r.temp)).map(r=>r.time)));
    const common=ref.filter(r=>finite(r.temp)&&validSets.every(s=>s.has(r.time)));
    scores[lead]=entries.map(e=>({id:e.id,...temperatureScore(e.rows,common)}));
  }
  return {...dates,scores,fetchedAt:new Date().toISOString(),errors:responses.map((r,i)=>r.status==='rejected'?`${MODELS[i].name}: ${r.reason.message}`:null).filter(Boolean)};
}
export function sampleData() {
  // Deliberately synthetic, opt-in preview. Never persisted as a real scan.
  const date=localDate(Date.now()/1000);
  const start=Date.parse(date+'T00:00:00+03:00')/1000;
  const data={version:1,sample:true,fetchedAt:new Date().toISOString(),locations:{},errors:[]};
  LOCATIONS.forEach((l,li)=>{
    const models={};
    MODELS.forEach((m,mi)=>models[m.id]=Array.from({length:168},(_,i)=>{
      const d=Math.floor(i/24),h=i%24,rainDay=l.country==='Greece'?2:l.country==='Cyprus'?3:4;
      const rain=d===rainDay&&h>6&&h<20?Math.max(0,2.8+Math.sin(h)*1.4+mi*.4):0;
      const temp=26+(l.id==='eilat'?7:l.id==='jerusalem'?-4:0)+5*Math.sin((h-8)*Math.PI/12)-d*.35+mi*.8+Math.sin(i/9+mi)*.6;
      return {time:start+i*HOUR,temp,rain,wind:12+Math.sin(h/4)*5+(rain?18:0)+mi,gust:23+(rain?34:0)+mi*4,pressure:1014-d*.8-(rain?6:0),code:rain?63:d>2?2:0};
    }));
    data.locations[l.id]={models,supplemental:models[MODELS[0].id].map(r=>({...r,feels:r.temp+1.8,humidity:65,probability:r.rain?75:5}))};
  });
  return data;
}
