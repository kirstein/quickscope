#!/usr/bin/env node
const findRoot   = require('find-project-root');
const quickscope = require('../src/index');

const root = findRoot(process.cwd(), { markers: findRoot.MARKERS.concat('package.json') });
const pkg = require(root + '/package.json');
const cfg = pkg.config.quickscope;

quickscope(cfg.files, cfg.cmd, root);
