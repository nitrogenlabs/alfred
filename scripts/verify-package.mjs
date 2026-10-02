import {readFile, access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(await readFile('package.json','utf8'));
for(const file of ['lib/index.js','lib/index.d.ts','lib/styles.css','lib/assets/alfred/swirl.png','lib/assets/alfred/fonts/outfit.ttf','lib/assets/alfred/fonts/OFL.txt']) await access(file);
const files=JSON.parse(execFileSync('npm',['pack','--dry-run','--json','--ignore-scripts'],{encoding:'utf8'}))[0].files.map(file=>file.path);
for(const file of ['lib/index.js','lib/styles.css','docs/assets/nitrogenx-desktop.png','docs/assets/nitrogenx-mobile.png']) if(!files.includes(file)) throw new Error(`Missing packaged file: ${file}`);
if(manifest.exports['./styles.css']!=='./lib/styles.css') throw new Error('Invalid CSS export');
console.log(`Package verified: ${files.length} files.`);
