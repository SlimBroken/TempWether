import {readFile,writeFile} from 'node:fs/promises';
import {fetchForecasts,summarizeScan,mergeScans} from '../src/weather.js';
const latest=await fetchForecasts();
const successful=Object.values(latest.locations).filter(l=>Object.keys(l.models).length);
if(!successful.length)throw Error('No valid forecasts; preserving previous archive.');
let history={version:1,scans:[]};
try{history=JSON.parse(await readFile('public/history.json','utf8'));}catch{}
history.scans=mergeScans([summarizeScan(latest)],history.scans);
await writeFile('public/latest.json',JSON.stringify(latest));
await writeFile('public/history.json',JSON.stringify(history));
console.log(`Archived ${successful.length} locations at ${latest.fetchedAt}; ${latest.errors.length} provider errors.`);
latest.errors.forEach(e=>console.warn(e));
