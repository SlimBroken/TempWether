import assert from 'node:assert/strict';
import {fetchField} from '../src/weather-field.js';
import {MODELS} from '../src/weather.js';
for(const model of MODELS){
 const data=await fetchField(model.id);
 assert.equal(data.cells.length,63);
 assert.ok(data.times.length>=160,'Expected nearly seven days of hourly fields');
 assert.ok(data.cells.some(c=>c.values.some(v=>v[0]!==null&&v[1]!==null)),'No wind vectors returned');
 console.log(`${model.name}: ${data.cells.length} grid points, ${data.times.length} hours, live wind vectors verified.`);
}
