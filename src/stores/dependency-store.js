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
  dependencies: {},
  cache: {}
};


function parseDependencies (payload) {
  return dTree.toList(payload.path, payload.cwd);
}

function buildDependencyList (dependencies, target, cwd) {
  let deps = data.dependencies;
  // Cache the target deps. Make sure we exclude ourselves from that
  data.cache[target] = _.without(dependencies, target);
  // Flip the dependency list
  // from target: [ dependency... ] to dependency: [ target ]
  return _.map(dependencies, function (dep) {
    deps[dep] = deps[dep] || new Dependency(dep, cwd);
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

function deleteDependency (path) {
  delete data.dependencies[path];
}

function removeFile (path) {
  let hasRemoved = false;
  _.each(data.dependencies, function(val, key) {
    if (key === path || val.removeTarget(path)) {
      hasRemoved = true;
      deleteDependency(key);
    }
  });
  if (hasRemoved) {
    hub.emit(constants.deps.DEPENDENCY_REMOVED, path);
  }
}

function addTarget (payload) {
  let path         = getFullPath(payload);
  let deps         = parseDependencies(payload);
  let dependencies = buildDependencyList(deps, path, payload.cwd);
  hub.emit(constants.deps.MULTIPLE_DEPENDENCY_ADDED, dependencies);
}

function getExcluded (arr1, arr2) {
  return _.reduce(arr1, function (old, val) {
    if (!_.contains(arr2, val)) {
      old.push(val);
    }
    return old;
  }, []);
}

function findOrphans (dependency, deps) {
  let dependencies = data.dependencies;
  let targets      = dependency.targets;
  return _.reduce(targets, function (result, target) {
    let cachedDeps = data.cache[target];
    let excluded   = getExcluded(cachedDeps, deps);
    let orphans    = _.filter(excluded, function (orphan) {
      let orphanModel = dependencies[orphan];
      orphanModel.removeTarget(target);
      return !orphanModel.targets.length;
    });
    return _.union(result, orphans);
  }, []);
}

function killOrphans (orphans) {
  if (orphans.length) {
    _.each(orphans, deleteDependency);
    console.log('Murdering orphans: ', orphans);
    hub.emit(constants.watcher.MULTIPLE_UNWATCH, orphans);
  }
}

function changeDependency (dep) {
  let path = dep.path;
  let cwd  = dep.cwd;
  let deps = parseDependencies({ path: path, cwd: cwd });
  killOrphans(findOrphans(dep, deps)); // Die bastards. Die
  let modifiedDeps = _.reduce(dep.targets, function (res, target) {
    return _.union(res, buildDependencyList(deps, target, cwd));
  }, []);
  hub.emit(constants.deps.MULTIPLE_DEPENDENCY_CHANGED, modifiedDeps);
}

exports.getDependencies = function () {
  return data.dependencies;
};

exports.clear = function () {
  data.dependencies = {};
};

exports._registerEvents = function () {
  hub.on(constants.file.FILE_ADDED, validatePayload(addTarget));
  hub.on(constants.file.FILE_REMOVED, validatePayload(removeFile));
  hub.on(constants.watcher.DEPENDENCY_CHANGED, changeDependency);
};
