import {execFileSync} from 'node:child_process';
execFileSync('npm', ['pack', '--ignore-scripts'], {stdio:'inherit'});
execFileSync('npm', ['install', '--ignore-scripts', '--prefix', 'examples/basic', './nlabs-alfred-0.1.0.tgz'], {stdio:'inherit'});
execFileSync('npm', ['run', 'test:e2e'], {stdio:'inherit'});
