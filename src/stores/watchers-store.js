'use strict';

const _        = require('lodash');
const chokidar = require('chokidar');
const hub      = require('../event-hub');

const constants = {
  deps: require('../constants/dependency-constants'),
  watcher: require('../constants/watcher-constants')
};

// List of watchers according to their path
//
// path: { watcher: <chokidar>, dependency: <dependency> }
var data = {};

function buildWatcher (dependency) {
  let watcher = chokidar.watch(dependency.path);
  watcher.on('change', function () {
    hub.emit(constants.watcher.DEPENDENCY_CHANGED, dependency);
  });
  return watcher;
}

function addMultipleIfNeeded (deps) {
  _.each(deps, function (dependency) {
    let path = dependency.path;
    // That path is already added.
    if (data[path] || !dependency.targets) {
      return;
    }
    data[path] = {
      dependency: dependency,
      watcher: buildWatcher(dependency)
    };
  });
}

function removeDependency (path) {
  let dep = data[path];
  dep.watcher.close();
  delete data[path];
}

exports.getWatchers = function () {
  return data;
};

exports.clear = function () {
  data = {};
};

exports._registerEvents = function () {
  hub.on(constants.deps.MULTIPLE_DEPENDENCY_ADDED, addMultipleIfNeeded);
  hub.on(constants.deps.MULTIPLE_DEPENDENCY_CHANGED, addMultipleIfNeeded);
  hub.on(constants.deps.DEPENDENCY_REMOVED, removeDependency);
};
