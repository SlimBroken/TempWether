import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/ui',timeout:45000,fullyParallel:false,
 use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1536,height:1080},screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'npm start',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
 reporter:[['list'],['html',{open:'never'}]],
});
