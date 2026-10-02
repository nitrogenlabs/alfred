import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const {version} = JSON.parse(readFileSync('package.json', 'utf8'));
execFileSync('npm', ['pack', '--ignore-scripts'], {stdio:'inherit'});
execFileSync('npm', ['install', '--ignore-scripts', '--prefix', 'examples/basic', `./nlabs-alfred-${version}.tgz`], {stdio:'inherit'});
execFileSync('npm', ['run', 'test:e2e'], {stdio:'inherit'});
