import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastDay,mapColor} from '../src/map-data.js';

test('Map switches to the chosen model and never fills a missing model with the blend',()=>{
 const time=Date.parse('2026-09-16T09:00:00Z')/1000;
 const data={models:{ecmwf_ifs025:[{time,temp:20,rain:4,gust:45}],icon_global:[{time,temp:30,rain:8,gust:65}]}};
 assert.equal(forecastDay(data,'2026-09-16','ecmwf_ifs025').high,20);
 assert.equal(forecastDay(data,'2026-09-16','icon_global').rain,8);
 assert.equal(forecastDay(data,'2026-09-16','blend').gust,55);
 assert.equal(forecastDay(data,'2026-09-16','gfs_global'),undefined);
 assert.equal(forecastDay(data,'2026-09-17','icon_global'),undefined);
});

test('Map colours follow their selected metric and preserve unknown values',()=>{
 assert.equal(mapColor(15,'rain'),'#bda2f5');
 assert.equal(mapColor(15,'high'),'#c9f479');
 assert.equal(mapColor(80,'gust'),'#f08b83');
 assert.equal(mapColor(null,'rain'),'#667583');
 assert.notEqual(mapColor(0,'rain'),mapColor(null,'rain'));
});
