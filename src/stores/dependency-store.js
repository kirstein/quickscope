'use strict';

const _     = require('lodash');
const dTree = require('dependency-tree');
const path  = require('path');

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
function parseDependencies (payload) {
  return dTree.toList({
    directory: payload.cwd,
    filter: path => path.indexOf('node_modules') === -1,
    filename: path.join(payload.cwd, payload.path),
  });
}

function getFullPath (payload) {
  return path.join(payload.cwd, payload.path);
}

class DependenciesStore {
  constructor (hub) {
    this._hub = hub;
    this._dependencies = {};
    this._cache        = {};
    this._registerEvents();
  }

  _registerEvents () {
    this._hub.on(constants.target.TARGET_ADDED, this.addTarget.bind(this));
    this._hub.on(constants.target.TARGET_REMOVED, this.removeTarget.bind(this));
    this._hub.on(constants.watcher.DEPENDENCY_FILE_CHANGED, this.changeDependency.bind(this));
    this._hub.on(constants.watcher.DEPENDENCY_FILE_UNLINK, this.removeDependency.bind(this));
  }

  _deleteDependency (path) {
    delete this._dependencies[path];
  }

  _findOrphans (dependency) {
    const cwd = dependency.cwd;
    // Go through dependency targets to see if those targets
    // have dropped any of their dependencies
    return _.reduce(dependency.targets, (result, target) => {
      // Update dependency list for the target itself
      let deps = parseDependencies({ cwd  : cwd, path : target });
      // Get the list of dropped dependencies.
      // Cache represents old dependencies, if this list is longer then we have a issue
      let excluded = getExcluded(this._cache[target], deps);
      this._cache[target] = deps;
      // All deps are the same
      if (!excluded.length) { return result; }
      return _.union(result, _.filter(excluded, (res) => this._isOrphan(res)));
    }, []);
  }

  _killOrphans (orphans) {
    if (orphans.length) {
      _.each(orphans, (orphan) => this._deleteDependency(orphan));
      this._hub.emit(constants.deps.MULTIPLE_DEPENDENCY_UNWATCH, orphans);
    }
  }

  _buildDependencyList(dependencies, target, cwd) {
    let deps = this._dependencies;
    // Cache the target deps. Make sure we exclude ourselves from that
    this._cache[target] = _.without(dependencies, target);
    // Flip the dependency list
    // from target: [ dependency... ] to dependency: [ target ]
    return _.map(dependencies, (dep) => {
      // Write the dependency to the list
      deps[dep] = deps[dep] || new Dependency(dep, cwd);
      deps[dep].addTarget(target);
      return deps[dep];
    });
  }

  _isOrphan (potentialOrphan) {
    let orphanModel = this._dependencies[potentialOrphan];
    // Orphan has only one target and we know that target.
    return orphanModel.targets.length === 1;
  }

  getDependencies () {
    return this._dependencies;
  }

  addTarget (target) {
    if (!target) throw new Error('No target defined');
    let path         = getFullPath(target);
    let deps         = parseDependencies(target);
    let dependencies = this._buildDependencyList(deps, path, target.cwd);
    this._hub.emit(constants.deps.MULTIPLE_DEPENDENCY_ADDED, dependencies);
  }

  removeDependency (dep) {
    if (!dep) { throw new Error('No dependency defined'); }
    if (dep.isTarget()) { return; }
    let deps = _.map(dep.targets, (target) => this._dependencies[target]);
    this._hub.emit(constants.deps.MULTIPLE_DENENDENCY_DIRTY, deps);
  }

  changeDependency (dep) {
    if (!dep) { throw new Error('No dependency defined'); }
    let deps = parseDependencies(dep);
    this._killOrphans(this._findOrphans(dep)); // Die bastards. Die
    let modifiedDeps = _.reduce(dep.targets, (res, target) => {
      return _.union(res, this._buildDependencyList(deps, target, dep.cwd));
    }, []);
    this._hub.emit(constants.deps.MULTIPLE_DEPENDENCY_CHANGED, modifiedDeps);
  }

  removeTarget(path) {
    if (!path) { throw new Error('No target defined'); }
    let hasRemoved = false;
    _.each(this._dependencies, (val, key) => {
      if (key === path || val.removeTarget(path)) {
        hasRemoved = true;
        this._deleteDependency(key);
      }
    });
    if (hasRemoved) {
      this._hub.emit(constants.deps.DEPENDENCY_UNWATCH, path);
    }
  }
}

module.exports = DependenciesStore;
