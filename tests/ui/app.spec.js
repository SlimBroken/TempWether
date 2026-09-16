import {test,expect} from '@playwright/test';
import {sampleData,LOCATIONS} from '../../src/weather.js';
import {sampleField} from '../../src/weather-field.js';

test.beforeEach(async({page})=>{
 await page.route('**/public/latest.json',r=>r.fulfill({status:404,body:'No saved forecast in this isolated test'}));
 await page.route('**/public/history.json',r=>r.fulfill({json:{version:1,scans:[]}}));
});

test('Unavailable providers, explicit sample preview, regional navigation and mobile layout',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());
 await page.goto('/');
 await page.getByRole('button',{name:'Explore sample preview'}).click();
 await expect(page.locator('.notice.sample')).toBeVisible();
 await expect(page.locator('[data-day]')).toHaveCount(7);
 await expect(page.locator('[data-model-card]')).toHaveCount(3);
 await expect(page.locator('[data-model-card="ecmwf_ifs025"]')).toContainText('Daily high / low');
 await page.screenshot({path:testInfo.outputPath('forecast-desktop.png'),fullPage:true});
 await page.locator('[data-day="3"]').click();
 await page.locator('[data-metric="rain"]').click();
 await page.locator('[data-tab="mediterranean"]').click();
 await expect(page.locator('.region-map')).toBeVisible();
 await expect(page.locator('#flow-play')).toBeEnabled();
 await expect(page.locator('.explorer-badge')).toHaveText('SYNTHETIC PREVIEW');
 await page.locator('#flow-motion').click();
 await page.locator('#flow-hour').fill('72');
 await expect(page.locator('#flow-hour')).toHaveValue('72');
 await page.locator('#weather-explorer').screenshot({path:testInfo.outputPath('storm-explorer-desktop.png')});
 await expect(page.getByText('Named storm status not connected')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('mediterranean-desktop.png'),fullPage:true});
 await page.locator('[data-layer="gust"]').click();
 await page.locator('[data-map-model="ecmwf_ifs025"]').click();
 const ecmwf=await page.locator('.map-point[data-place="athens"] .point-value').textContent();
 await page.locator('[data-map-model="icon_global"]').click();
 expect(await page.locator('.map-point[data-place="athens"] .point-value').textContent()).not.toBe(ecmwf);
 await expect(page.locator('.map-value-caption')).toContainText('ICON');
 await page.locator('[data-layer="high"]').click();
 await expect(page.locator('.map-value-caption')).toContainText('Daily high temperature');
 await page.locator('[data-scope="israel"]').click();
 await expect(page.locator('.israel-map .map-point')).toHaveCount(8);
 await page.locator('.map-point[data-place="jerusalem"]').press('Enter');
 await expect(page.locator('.compare-compact h2')).toHaveText('Jerusalem');
 await page.screenshot({path:testInfo.outputPath('israel-model-map.png'),fullPage:true});
 await page.locator('[data-scope="region"]').click();
 await page.locator('#regional-day').fill('4');
 await page.locator('#regional-day').dispatchEvent('change');
 await page.locator('.map-point[data-place="paphos"]').click();
 await expect(page.locator('#location')).toHaveValue('paphos');
 await expect(page.locator('.compare-compact h2')).toHaveText('Paphos');
 await page.locator('#city-forecast').click();
 await expect(page.locator('[data-day="4"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-open-map="gfs_global"]').click();
 await expect(page.locator('[data-map-model="gfs_global"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-tab="history"]').click();
 await expect(page.getByText('Your weather timeline starts here.')).toBeVisible();
 await page.locator('[data-tab="accuracy"]').click();
 await page.getByRole('button',{name:'Run 14-day comparison'}).click();
 await expect(page.locator('.notice.error')).toBeVisible();
 for(const tab of ['forecast','mediterranean','history','accuracy']){
  await page.setViewportSize({width:390,height:844});
  await page.locator(`[data-tab="${tab}"]`).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:testInfo.outputPath(`${tab}-mobile.png`),fullPage:true});
 }
 expect(errors).toEqual([]);
});

test('Animated map layers, playback, zoom, inspection and reduced motion',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('https://**/*',r=>r.abort());
 await page.goto('/');await page.getByRole('button',{name:'Explore sample preview'}).click();
 await page.locator('[data-tab="mediterranean"]').click();
 await expect(page.locator('#flow-play')).toBeEnabled();
 await expect(page.locator('#flow-motion')).toHaveAttribute('aria-pressed','false');
 await page.locator('#flow-location').selectOption('paphos');
 const initial=await page.locator('#flow-values').textContent();
 await page.locator('#flow-hour').fill('72');
 expect(await page.locator('#flow-values').textContent()).not.toBe(initial);
 await page.locator('#flow-model').selectOption('icon_global');
 await expect(page.locator('#flow-time')).toContainText('ICON');
 await page.locator('[data-flow-layer="wind"]').click();
 await expect(page.locator('.flow-legend')).toContainText('Wind speed at 10 m');
 await page.locator('#flow-israel').click();
 await page.locator('#flow-plus').click();await page.locator('#flow-minus').click();
 await page.locator('#flow-region').click();
 await page.locator('.flow-base').click({position:{x:300,y:250}});
 await expect(page.locator('#flow-location')).toHaveValue('custom');
 await page.locator('#flow-play').click();
 await expect.poll(async()=>Number(await page.locator('#flow-hour').inputValue())).toBeGreaterThan(72);
 await page.getByRole('button',{name:'Pause forecast timeline'}).click();
 await page.locator('#flow-hour').fill('167');await page.locator('#flow-play').click();
 await expect.poll(async()=>Number(await page.locator('#flow-hour').inputValue())).toBeLessThan(167);
 await page.getByRole('button',{name:'Pause forecast timeline'}).click();
 await page.locator('#flow-now').click();await expect(page.locator('#flow-hour')).toHaveValue('0');
 await page.locator('[data-flow-layer="storm"]').click();await page.locator('#flow-hour').fill('96');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.locator('#weather-explorer').screenshot({path:testInfo.outputPath('storm-explorer-mobile.png')});
 await page.locator('#flow-motion').click();await expect(page.locator('#flow-motion')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-tab="forecast"]').click();
 expect(errors).toEqual([]);
});

test('Regional API grid is distinct from cities, switches model and preserves unavailable values',async({page})=>{
 const fixture=sampleData();delete fixture.sample;
 await page.route('**/public/latest.json',r=>r.fulfill({json:fixture}));
 let requests=0;
 await page.route('https://**/*',async route=>{
  const u=new URL(route.request().url());
  if(!u.hostname.endsWith('open-meteo.com'))return route.abort();
  expect(u.searchParams.get('hourly')).toContain('wind_direction_10m');
  expect(u.searchParams.get('cell_selection')).toBe('nearest');
  requests++;
  const model=u.searchParams.get('models');
  if(model==='icon_global')return route.fulfill({status:503,json:{reason:'Test provider outage'}});
  const data=sampleField(model);
  const payload=data.cells.map(c=>({hourly:{time:data.times,wind_speed_10m:c.values.map(v=>Math.hypot(v[0],v[1])),wind_direction_10m:c.values.map(v=>(Math.atan2(-v[0],-v[1])*180/Math.PI+360)%360),precipitation:c.values.map(v=>v[2]),wind_gusts_10m:c.values.map(v=>v[3]),cloud_cover:c.values.map(()=>null),pressure_msl:c.values.map(v=>v[5])}}));
  return route.fulfill({json:payload});
 });
 await page.goto('/');await expect(page.locator('[data-day]')).toHaveCount(7);
 await page.locator('[data-tab="mediterranean"]').click();
 await expect(page.locator('#flow-play')).toBeEnabled();
 await expect(page.locator('.explorer-badge')).toContainText('MODEL FORECAST');
 await expect(page.locator('#flow-values')).toContainText('—%');
 await page.locator('#flow-model').selectOption('gfs_global');await expect(page.locator('#flow-time')).toContainText('GFS');
 await page.locator('#flow-model').selectOption('icon_global');await expect(page.locator('.flow-status')).toContainText('Regional graphics unavailable');
 await expect(page.locator('#flow-play')).toBeDisabled();await expect(page.locator('#flow-values')).not.toContainText('1019');
 await page.locator('#flow-model').selectOption('ecmwf_ifs025');await expect(page.locator('#flow-time')).toContainText('ECMWF');
 expect(requests).toBe(3); // The first model is reused from the in-memory cache.
});

test('Successful model responses persist real scans, export CSV, and show benchmark results',async({page})=>{
 const fixture=sampleData();
 await page.route('https://**/*',async route=>{
  const u=new URL(route.request().url());
  if(!u.hostname.endsWith('open-meteo.com'))return route.abort();
  if(u.hostname==='api.open-meteo.com'){
   const model=u.searchParams.get('models');
   const payload=LOCATIONS.map(l=>{
    const rows=model==='best_match'?fixture.locations[l.id].supplemental:fixture.locations[l.id].models[model];
    const mapping={temperature_2m:'temp',precipitation:'rain',wind_speed_10m:'wind',wind_gusts_10m:'gust',pressure_msl:'pressure',weather_code:'code',relative_humidity_2m:'humidity',apparent_temperature:'feels',precipitation_probability:'probability'};
    return {hourly:{time:rows.map(r=>r.time),...Object.fromEntries(Object.entries(mapping).map(([key,k])=>[key,rows.map(r=>r[k]??null)]))}};
   });
   return route.fulfill({json:payload});
  }
  const hourly={time:[1,2,3]};
  if(u.hostname==='archive-api.open-meteo.com')hourly.temperature_2m=[20,21,22];
  else for(const lead of [1,3,7])hourly[`temperature_2m_previous_day${lead}`]=[21,22,23];
  return route.fulfill({json:{hourly}});
 });
 await page.goto('/');await expect(page.locator('[data-day]')).toHaveCount(7);
 await expect(page.locator('.notice.sample')).toHaveCount(0);
 await page.locator('[data-tab="history"]').click();
 await expect(page.getByText('Your first scan is saved.',{exact:false})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV'}).click();
 expect((await download).suggestedFilename()).toContain('TempWether-tel-aviv');
 await page.reload();await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.locator('[data-tab="accuracy"]').click();
 await page.getByRole('button',{name:'Run 14-day comparison'}).click();
 await expect(page.locator('.score-card')).toHaveCount(3);
 await expect(page.locator('.score-card').first()).toContainText('1.00');
});
