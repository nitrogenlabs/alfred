import {defineConfig, devices} from '@playwright/test';
export default defineConfig({testDir:'./e2e',projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}],use:{baseURL:'http://localhost:3301'},webServer:{command:'npm run start --prefix examples/basic',url:'http://localhost:3301',reuseExistingServer:true,timeout:60000}});
