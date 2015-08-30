#!/usr/bin/env node
var quickscope = require('../src/index');

quickscope('src/**/__tests__/**/**.js', 'jest', process.cwd());
