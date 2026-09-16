import {test,expect} from '@playwright/test';
import {sampleData,LOCATIONS} from '../../src/weather.js';

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
 await page.screenshot({path:testInfo.outputPath('forecast-desktop.png'),fullPage:true});
 await page.locator('[data-day="3"]').click();
 await page.locator('[data-metric="rain"]').click();
 await page.locator('[data-tab="mediterranean"]').click();
 await expect(page.locator('.region-map')).toBeVisible();
 await expect(page.getByText('Named storm status not connected')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('mediterranean-desktop.png'),fullPage:true});
 await page.locator('[data-layer="gust"]').click();
 await page.locator('#regional-day').fill('4');
 await page.locator('#regional-day').dispatchEvent('change');
 await page.locator('.map-point[data-place="paphos"]').click();
 await expect(page.locator('#location')).toHaveValue('paphos');
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
