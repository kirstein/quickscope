'use strict';

const _     = require('lodash');

const hub        = require('../event-hub');
const Dependency = require('../models/dependency');

const constants  = {
  deps: require('../constants/dependency-constants'),
  file: require('../constants/file-constants')
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

function addFile (payload) {
  let path         = payload.path;
  let deps         = payload.deps;
  let dependencies = buildDependencyList(deps, path);
  hub.emit(constants.deps.MULTIPLE_DEPENDENCY_ADDED, dependencies);
}

function changeFile (payload) {
  let path = payload.path;
  let deps = payload.deps;
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
};
