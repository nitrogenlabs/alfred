import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
await mkdir('lib/assets', {recursive:true});
await cp('src/assets', 'lib/assets', {recursive:true});
const css = (await readFile('src/styles.css','utf8')).replaceAll('../../assets/', './assets/');
await writeFile('lib/styles.css',css);

for (const file of ["lib/testSetup.js", "lib/assets.d.js", "lib/assets.d.d.ts"]) await rm(file, {force:true});
