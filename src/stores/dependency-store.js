'use strict';

const _     = require('lodash');
const dTree = require('dependency-tree');
const path  = require('path');

const hub         = require('../event-hub');
const Dependency  = require('../models/dependency');
const getExcluded = require('../lib/get-excluded');

const constants  = {
  deps    : require('../constants/dependency-constants'),
  target  : require('../constants/target-constants'),
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
  dependencies : {},
  cache        : {}
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
    // Write the dependency to the list
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

function removeTarget (path) {
  let hasRemoved = false;
  _.each(data.dependencies, function (val, key) {
    if (key === path || val.removeTarget(path)) {
      hasRemoved = true;
      deleteDependency(key);
    }
  });
  if (hasRemoved) {
    hub.emit(constants.deps.DEPENDENCY_UNWATCH, path);
  }
}

function addTarget (payload) {
  let path         = getFullPath(payload);
  let deps         = parseDependencies(payload);
  let dependencies = buildDependencyList(deps, path, payload.cwd);
  hub.emit(constants.deps.MULTIPLE_DEPENDENCY_ADDED, dependencies);
}

function isOrphan (potentialOrphan) {
  let orphanModel = data.dependencies[potentialOrphan];
  // Orphan has only one target and we know that target.
  return orphanModel.targets.length === 1;
}

function findOrphans (dependency) {
  const cwd = dependency.cwd;
  // Go through dependency targets to see if those targets
  // have dropped any of their dependencies
  return _.reduce(dependency.targets, function (result, target) {
    // Update dependency list for the target itself
    let deps = parseDependencies({ cwd  : cwd, path : target });
    // Get the list of dropped dependencies.
    // Cache represents old dependencies, if this list is longer then we have a issue
    let excluded = getExcluded(data.cache[target], deps);
    data.cache[target] = deps;
    // All deps are the same
    if (!excluded.length) { return result; }
    return _.union(result, _.filter(excluded, isOrphan));
  }, []);
}

function killOrphans (orphans) {
  if (orphans.length) {
    _.each(orphans, deleteDependency);
    hub.emit(constants.deps.MULTIPLE_DEPENDENCY_UNWATCH, orphans);
  }
}

function changeDependency (dep) {
  let deps = parseDependencies(dep);
  killOrphans(findOrphans(dep)); // Die bastards. Die
  let modifiedDeps = _.reduce(dep.targets, function (res, target) {
    return _.union(res, buildDependencyList(deps, target, dep.cwd));
  }, []);
  hub.emit(constants.deps.MULTIPLE_DEPENDENCY_CHANGED, modifiedDeps);
}

function removeDependency (dep) {
  if (dep.isTarget()) { return; }
  let deps = _.map(dep.targets, function (target) {
    return data.dependencies[target];
  });
  hub.emit(constants.deps.MULTIPLE_DENENDENCY_DIRTY, deps);
}

exports.getDependencies = function () {
  return data.dependencies;
};

exports.clear = function () {
  data.dependencies = {};
};

exports._registerEvents = function () {
  hub.on(constants.target.TARGET_ADDED, validatePayload(addTarget));
  hub.on(constants.target.TARGET_REMOVED, validatePayload(removeTarget));
  hub.on(constants.watcher.DEPENDENCY_FILE_CHANGED, validatePayload(changeDependency));
  hub.on(constants.watcher.DEPENDENCY_FILE_UNLINK, validatePayload(removeDependency));
};
