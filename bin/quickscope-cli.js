#!/usr/bin/env node

'use strict';

const _          = require('lodash');
const path       = require('path');
const findRoot   = require('find-project-root');
const Spinner    = require('cli-spinner').Spinner;
const quickscope = require('../src/index');
const root       = findRoot(process.cwd(), {
  markers: findRoot.MARKERS.concat('package.json')
});

const GHETTO_TAB = '  ';

function getCfg (file) {
  let conf = require(path.join(root, file));
  if (_.endsWith(file, 'package.json')) {
    return conf.config.quickscope;
  }
  return conf;
}

function showWelcome (files) {
  let txt = [ 'Quickscope ready for duty. Watching following files: \n' ];
  let map = _.map(files, function (fname) {
    return GHETTO_TAB + fname;
  });
  console.log(txt.concat(map).join('\n') + '\n');
}

function fileChange (msg, file) {
  return [ '\n\n' + GHETTO_TAB, msg, file, '\n' ].join(' ');
}

const cfg = getCfg('package.json');

let watching = new Spinner('%s waiting for changes...');
watching.setSpinnerString('|/-\\');

let isReady = false;
let qs      = quickscope(cfg.files, cfg.cmd, { cwd: root });
qs.on('ready', function (files) {
  isReady = true;
  showWelcome(files);
  watching.start();
});

qs.on('add', function (file) {
  if (!isReady) { return; }
  console.log(fileChange('Added new test:', file));
});

qs.on('unlink', function (file) {
  console.log(fileChange('Unlinked file:', file));
});

qs.on('run', function (files, done) {
  console.log(fileChange('Testing:', files.join()));
  watching.stop();
  done(function () {
    watching.start();
  });
});
