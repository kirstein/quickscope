'use strict';

const chokidar  = require('chokidar');
const _         = require('lodash');

const Quickscope = require('./quickscope');

// Initiating stores
require('./stores/dependency-store')._registerEvents();
require('./stores/watchers-store')._registerEvents();

const DEFAULT_OPTS = {
  persistent: true,
  alwaysStat: false,
  followSymlinks: true
};

function buildOpts (cwd, options) {
  return _.assign({}, DEFAULT_OPTS, {
    cwd: cwd
  }, options);
}

module.exports = function (glob, cmd, cwd, options) {
  cwd = cwd || process.cwd();

  if (!cmd) {
    throw new Error('No cmd defined');
  }

  const opts    = buildOpts(cwd, options);
  const watcher = chokidar.watch(glob, opts);
  return new Quickscope(cmd, cwd, watcher);
};

module.exports.DEFAULT_OPTS = DEFAULT_OPTS;
