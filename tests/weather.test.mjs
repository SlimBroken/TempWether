import test from 'node:test';
import assert from 'node:assert/strict';
import {mean,blend,daily,normalize,modelSignal,temperatureScore,forecastURL,LOCATIONS,mergeScans,fetchForecasts,fetchBenchmark} from '../src/weather.js';

test('Missing data never becomes zero or contributes to the blend',()=>{
 assert.equal(mean([null,undefined,NaN]),null);
 const rows=blend({a:[{time:1,temp:20,rain:null,wind:10,code:0}],b:[{time:1,temp:24,rain:2,wind:null,code:0}],c:[{time:1,temp:null,rain:4,wind:20,code:null}]});
 assert.equal(rows[0].temp,22);assert.equal(rows[0].rain,3);assert.equal(rows[0].wind,15);assert.equal(rows[0].members,2);assert.equal(rows[0].low,20);assert.equal(rows[0].high,24);
});
test('Forecasts join on timestamp, not position; missing model hours stay absent',()=>{
 const rows=blend({a:[{time:20,temp:10},{time:30,temp:20}],b:[{time:10,temp:4},{time:30,temp:24}]});
 assert.deepEqual(rows.map(r=>[r.time,r.temp,r.members]),[[10,4,1],[20,10,1],[30,22,2]]);
});
test('Daily aggregation uses Israel dates, handles DST, and counts missing rain',()=>{
 const start=Date.parse('2026-10-24T21:00:00Z')/1000;
 const rows=Array.from({length:25},(_,i)=>({time:start+i*3600,temp:i,rain:i===0?null:1,gust:i,low:i,high:i+2,members:3,code:0}));
 const d=daily(rows);assert.equal(d.length,1);assert.equal(d[0].date,'2026-10-25');assert.equal(d[0].hours,25);assert.equal(d[0].rain,24);assert.equal(d[0].rainHours,24);
});
test('Single-model and suffixed provider responses normalize without losing nulls',()=>{
 const rows=normalize({hourly:{time:[1,2],temperature_2m_icon_global:[null,20],precipitation:[0,1]}},'icon_global');
 assert.equal(rows[0].temp,null);assert.equal(rows[1].temp,20);assert.equal(rows[0].rain,0);assert.equal(rows[0].gust,null);
});
test('Regional signals classify thresholds and distinguish unknown from calm',()=>{
 assert.equal(modelSignal({rain:null,gust:null}).level,'unknown');assert.equal(modelSignal({rain:0,gust:0}).level,'low');
 assert.equal(modelSignal({rain:15,gust:0}).level,'watch');assert.equal(modelSignal({rain:0,gust:80}).level,'high');
});
test('Error metrics use matching observed hours and ignore missing reference',()=>{
 const s=temperatureScore([{time:1,temp:12},{time:2,temp:17},{time:3,temp:100}],[{time:1,temp:10},{time:2,temp:20},{time:3,temp:null}]);
 assert.equal(s.count,2);assert.equal(s.mae,2.5);assert.equal(s.bias,-.5);assert.equal(s.rmse,Math.sqrt(6.5));
});
test('API requests explicitly use seven days, absolute timestamps and Israel timezone',()=>{
 const p=new URL(forecastURL(LOCATIONS,'icon_global')).searchParams;
 assert.equal(p.get('forecast_days'),'7');assert.equal(p.get('timeformat'),'unixtime');assert.equal(p.get('timezone'),'Asia/Jerusalem');assert.equal(p.get('latitude').split(',').length,14);
});
test('History merges, deduplicates and caps scans',()=>{
 const rows=Array.from({length:300},(_,i)=>({at:new Date(i*3600000).toISOString(),locations:{}}));
 const result=mergeScans(rows,rows);assert.equal(result.length,240);assert.equal(result[0].at,rows[299].at);
});
test('A failed model does not discard successful forecasts',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{const u=new URL(url);if(u.searchParams.get('models')==='gfs_global')throw Error('offline');return {ok:true,json:async()=>({hourly:{time:[1],temperature_2m:[20],precipitation:[0]}})};};
 try{const data=await fetchForecasts([LOCATIONS[0]]);assert.equal(Object.keys(data.locations['tel-aviv'].models).length,2);assert.equal(data.errors.length,1);}finally{globalThis.fetch=original;}
});
test('Accuracy scores compare the exact same hours across models',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{const u=new URL(url),model=u.searchParams.get('models');const hourly={time:[1,2,3]};
 if(model==='era5')hourly.temperature_2m=[10,20,30];else for(const lead of [1,3,7])hourly[`temperature_2m_previous_day${lead}`]=model==='icon_global'?[12,null,32]:[11,100,31];
 return {ok:true,json:async()=>({hourly})};};
 try{const b=await fetchBenchmark(LOCATIONS[0]);assert.deepEqual(b.scores[3].map(s=>s.count),[2,2,2]);assert.deepEqual(b.scores[3].map(s=>s.mae),[1,1,2]);}finally{globalThis.fetch=original;}
});
