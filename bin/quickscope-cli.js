#!/usr/bin/env node

'use strict';

const _          = require('lodash');
const argv       = require('minimist')(process.argv.slice(2));
const path       = require('path');
const findRoot   = require('find-project-root');
const Spinner    = require('cli-spinner').Spinner;
const Quickscope = require('../src/quickscope');
const root       = findRoot(process.cwd(), {
  markers: findRoot.MARKERS.concat('package.json')
});

const spawn = require('../src/lib/spawn');
const GHETTO_TAB = '  ';

function getCfg () {
  let file = argv.c || 'package.json';
  let conf = require(path.join(root, file));
  if (_.endsWith(file, 'package.json')) {
    return conf.config.quickscope;
  }
  return conf;
}

function buildCmd (cmd, targets) {
  return cmd + ' ' + targets.join(' ');
}

function showWelcome (files) {
  let txt = [ 'Watching following files: \n' ];
  let map = _.map(files, function (fname) {
    return GHETTO_TAB + fname;
  });
  console.log(txt.concat(map).join('\n') + '\n');
}

function fileChange (msg, file) {
  return [ '\n\n' + GHETTO_TAB, msg, file, '\n' ].join(' ');
}

const cfg = getCfg();

let watching = new Spinner('%s waiting for changes...');
watching.setSpinnerString('|/-\\');

let isReady = false;
let qs      = new Quickscope(cfg.files, { cwd: root });
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

qs.on('change', function (deps) {
  watching.stop();
  let targets = deps.targets || _.reduce(deps, function (res, dep) {
    return _.union(res, dep.targets);
  }, []);
  console.log(fileChange('Testing:', targets.join()));
  spawn(buildCmd(cfg.cmd, targets), targets[0].cwd).on('close', function () {
    watching.start();
  });
});
