'use strict';

const chokidar  = require('chokidar');
const _         = require('lodash');
const fs        = require('fs');
const precinct  = require('precinct');

const targets  = require('./stores/target-store');

const DEFAULT_OPTS = {
  persistent: true,
  alwaysStat: false,
  followSymlinks: true
};

function isValidDependency (dep) {
  return _.startsWith(dep, '.');
}

function getDeps (target) {
  let content = fs.readFileSync(target, 'utf8');
  return _.filter(precinct(content), isValidDependency);
}

function addTarget (target) {
  targets.add(target, getDeps(target));
}

function changeTarget (target) {
  targets.change(target, getDeps(target));
}

function buildOpts (cwd, options) {
  return _.assign({}, DEFAULT_OPTS, {
    cwd: process.cwd()
  }, options);
}

module.exports = function (glob, cwd, options) {
  const opts    = buildOpts(cwd, options);
  const watcher = chokidar.watch(glob, opts);

  watcher.on('add', addTarget);
  watcher.on('change', changeTarget);
  return watcher;
};

module.exports.DEFAULT_OPTS = DEFAULT_OPTS;
