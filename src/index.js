'use strict';

const chokidar  = require('chokidar');
const _         = require('lodash');
const dTree     = require('dependency-tree');
const path      = require('path');

const hub    = require('./event-hub');
const Runner = require('./runner');

const constants = {
  file: require('./constants/file-constants')
};

// Initiating stores
require('./stores/dependency-store')._registerEvents();
require('./stores/watchers-store')._registerEvents();

const DEFAULT_OPTS = {
  persistent: true,
  alwaysStat: false,
  followSymlinks: true
};

function getTargetPath (cwd, target) {
  return path.join(cwd, target);
}

function getDeps (cwd, target) {
  return dTree.toList(target, cwd);
}

function preparePayload (cwd, target) {
  return {
    path: getTargetPath(cwd, target),
    deps: getDeps(cwd, target)
  };
}

function addTarget (cwd, target) {
  let data = preparePayload(cwd, target);
  console.log('file added: ', target);
  hub.emit(constants.file.FILE_ADDED, data);
}

function changeTarget (cwd, target) {
  let data = preparePayload(cwd, target);
  console.log('file changed: ', target);
  hub.emit(constants.file.FILE_CHANGED, data);
}

function buildOpts (cwd, options) {
  return _.assign({}, DEFAULT_OPTS, {
    cwd: cwd
  }, options);
}

module.exports = function (glob, cmd, cwd, options) {
  cwd = cwd || process.cwd();

  if (!cmd) {
    throw new Error('Cmd not defined');
  }

  const opts    = buildOpts(cwd, options);
  const watcher = chokidar.watch(glob, opts);
  const runner  = new Runner(cmd, cwd, watcher);

  watcher.on('add', _.partial(addTarget, cwd));
  watcher.on('change', _.partial(changeTarget, cwd));

  return runner;
};

module.exports.DEFAULT_OPTS = DEFAULT_OPTS;
