import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GRID_POINTS,GRID,windVector,fieldURL,normalizeField,sampleAt,sampleField} from '../src/weather-field.js';
import {weatherColor} from '../src/weather-explorer.js';

test('Meteorological FROM directions become east/north TO vectors',()=>{
 const [u,v]=windVector(20,0);assert.ok(Math.abs(u)<1e-8);assert.equal(v,-20);
 const west=windVector(20,270);assert.equal(west[0],20);assert.ok(Math.abs(west[1])<1e-8);
 assert.deepEqual(windVector(null,0),[null,null]);assert.deepEqual(windVector(20,null),[null,null]);
});
test('Grid requests include marine cells, selected model, wind directions and absolute hourly time',()=>{
 const p=new URL(fieldURL('icon_global')).searchParams;
 assert.equal(p.get('cell_selection'),'nearest');assert.equal(p.get('models'),'icon_global');
 assert.equal(p.get('latitude').split(',').length,63);assert.equal(p.get('forecast_hours'),'168');
 assert.equal(p.get('timeformat'),'unixtime');assert.match(p.get('hourly'),/wind_direction_10m/);
 assert.throws(()=>fieldURL('unknown'));
});
const rawGrid=()=>GRID_POINTS.map(()=>({hourly:{time:[100,200],wind_speed_10m:[20,30],wind_direction_10m:[359,1],precipitation:[0,null],wind_gusts_10m:[40,50],cloud_cover:[50,60],pressure_msl:[1000,1001]}}));
test('Grid normalizes by timestamp and retains missing values and missing cells',()=>{
 const raw=rawGrid();raw[0].hourly={time:[200],wind_speed_10m:[30],wind_direction_10m:[1],precipitation:[5]};
 const field=normalizeField(raw,'gfs_global');
 assert.equal(field.cells[0].values[0][0],null);assert.equal(field.cells[0].values[1][2],5);
 assert.equal(field.cells[1].values[0][2],0);assert.equal(field.cells[1].values[1][2],null);
 assert.throws(()=>normalizeField([],'gfs_global'),/Incomplete/);
});
test('Interpolation never fills missing corners, does not extrapolate, and preserves boundary values',()=>{
 const field=normalizeField(rawGrid(),'gfs_global');
 assert.equal(sampleAt(field,0,GRID.west,GRID.north).rain,0);
 field.cells[0].values[0][2]=null;
 const center=sampleAt(field,0,21,40);assert.equal(center.rain,null);assert.ok(center.wind>19);
 assert.equal(sampleAt(field,1,21,40).rain,null);
 assert.equal(sampleAt(field,0,10,40),null);
 assert.equal(sampleAt(field,999,21,40).wind,null);
 assert.equal(sampleAt(field,0,GRID.east,GRID.south).rain,0);
});
test('North winds straddling 360 degrees interpolate through north, not south',()=>{
 const raw=rawGrid();raw[1].hourly.wind_direction_10m=[1,1];
 const field=normalizeField(raw,'gfs_global'),s=sampleAt(field,0,21.125,41);
 assert.ok(s.v<0);assert.ok(Math.abs(s.u)<1e-8);assert.ok(s.direction<1||s.direction>359);
});
test('Synthetic grids stay explicit and differ by model; unknown colors are transparent',()=>{
 const a=sampleField('ecmwf_ifs025',0),b=sampleField('icon_global',0);
 assert.equal(a.sample,true);assert.equal(a.times.length,168);assert.equal(a.cells.length,63);
 assert.notDeepEqual(a.cells[20].values,b.cells[20].values);
 assert.deepEqual(weatherColor(null,'wind'),[0,0,0,0]);
 assert.notDeepEqual(weatherColor(5,'wind'),weatherColor(75,'wind'));
});
