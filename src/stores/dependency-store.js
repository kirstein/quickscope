'use strict';

const _     = require('lodash');
const dTree = require('dependency-tree');
const path  = require('path');

const hub        = require('../event-hub');
const Dependency = require('../models/dependency');

const constants  = {
  deps    : require('../constants/dependency-constants'),
  file    : require('../constants/file-constants'),
  watcher : require('../constants/watcher-constants')
};

// X, Y, C = targets
//
// X - [ a, b, c ]
// Y - [ b, e, a ]
// C - [ d, b ]
//
// a, b, c, d, e = dependencies
//
// a - [ X, Y ]
// b - [ X, C ]
// c - [ X ]
// d - [ C ]
// e - [ Y ]
var data = {
  dependencies: {}
};

function parseDependencies (payload) {
  return dTree.toList(payload.path, payload.cwd);
}

function buildDependencyList (dependencies, target) {
  let deps = data.dependencies;
  // Flip the dependency list
  // from target: [ dependency... ] to dependency: [ target ]
  return _.map(dependencies, function (dep) {
    deps[dep] = deps[dep] || new Dependency(dep);
    deps[dep].addTarget(target);
    return deps[dep];
  });
}

function validatePayload (fn) {
  return function (payload) {
    if (!payload) {
      throw new Error('No payload attached');
    }
    return fn(payload);
  };
}

function getFullPath (payload) {
  return path.join(payload.cwd, payload.path);
}

function addFile (payload) {
  let path         = getFullPath(payload);
  let deps         = parseDependencies(payload);
  let dependencies = buildDependencyList(deps, path);
  hub.emit(constants.deps.MULTIPLE_DEPENDENCY_ADDED, dependencies);
}

function changeFile (payload) {
  let path = getFullPath(payload);
  let deps = parseDependencies(payload);
  buildDependencyList(deps, path);
  hub.emit(constants.deps.MULTIPLE_DEPENDENCY_CHANGED);
}

function removeFile (path) {
  let deps       = data.dependencies;
  let hasRemoved = false;
  _.each(deps, function(val, key) {
    if (key === path || val.removeTarget(path)) {
      hasRemoved = true;
      delete deps[key];
    }
  });
  if (hasRemoved) {
    hub.emit(constants.deps.DEPENDENCY_REMOVED, path);
  }
}

function changeDependency (dependency) {
  // console.log(dependency);
}

exports.getDependencies = function () {
  return data.dependencies;
};

exports.clear = function () {
  data.dependencies = {};
};

exports._registerEvents = function () {
  hub.on(constants.file.FILE_ADDED, validatePayload(addFile));
  hub.on(constants.file.FILE_CHANGED, validatePayload(changeFile));
  hub.on(constants.file.FILE_REMOVED, validatePayload(removeFile));
  hub.on(constants.watcher.DEPENDENCY_CHANGED, changeDependency);
};
