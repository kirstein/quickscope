'use strict';

const chokidar  = require('chokidar');
const _         = require('lodash');

const Quickscope = require('./quickscope');


const DEFAULT_OPTS = {
  persistent: true,
  alwaysStat: false,
  followSymlinks: true,
  cwd: process.cwd()
};

module.exports = function (glob, cmd, options) {
  if (!cmd) {
    throw new Error('No cmd defined');
  } else if (!glob) {
    throw new Error('No glob defined');
  }

  const opts    = _.assign({}, DEFAULT_OPTS, options);
  const watcher = chokidar.watch(glob, opts);
  return new Quickscope(cmd, opts.cwd, watcher);
};

module.exports.DEFAULT_OPTS = DEFAULT_OPTS;
