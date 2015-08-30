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
const data = {};

function buildWatcher (dependency) {
  console.log(dependency.path);
  let watcher = chokidar.watch(dependency.path);
  watcher.on('change', function () {
    hub.emit(constants.watcher.DEPENDENCY_CHANGED, dependency);
  });
  return watcher;
}

function addMultipleIfNeeded (deps) {
  _.each(deps, function (dependency) {
    let path = dependency.path;
    // That path is alreadya added.
    if (data[path]) {
      return;
    }
    data[path] = {
      dependency: dependency,
      watcher: buildWatcher(dependency)
    };
  });
}


exports.getWatchers = function () {
  return data;
};

exports._registerEvents = function () {
  hub.on(constants.deps.MULTIPLE_DEPENDENCY_ADDED, addMultipleIfNeeded);
  hub.on(constants.deps.MULTIPLE_DEPENDENCY_CHANGED, addMultipleIfNeeded);
};
