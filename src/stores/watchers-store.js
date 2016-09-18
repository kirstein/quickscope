'use strict';

const _        = require('lodash');
const chokidar = require('chokidar');

const constants = {
  deps: require('../constants/dependency-constants'),
  watcher: require('../constants/watcher-constants')
};

function buildWatcher (hub, dependency) {
  let watcher = chokidar.watch(dependency.path);
  watcher.on('change', () => hub.emit(constants.watcher.DEPENDENCY_FILE_CHANGED, dependency));
  watcher.on('unlink', () => hub.emit(constants.watcher.DEPENDENCY_FILE_UNLINK, dependency));
  return watcher;
}

class DependenciesStore {
  constructor (hub) {
    this._hub  = hub;
    this._data = {};
    this._registerEvents();
  }

  _registerEvents () {
    this._hub.on(constants.deps.MULTIPLE_DEPENDENCY_ADDED, this.addMultipleIfNeeded.bind(this));
    this._hub.on(constants.deps.MULTIPLE_DEPENDENCY_CHANGED, this.addMultipleIfNeeded.bind(this));
    this._hub.on(constants.deps.DEPENDENCY_UNWATCH, this.unwatch.bind(this));
    this._hub.on(constants.deps.MULTIPLE_DEPENDENCY_UNWATCH, this.multipleUnwatch.bind(this));
  }

  getWatchers () {
    return this._data;
  }

  multipleUnwatch (deps) {
    _.each(deps, (dep) => this.unwatch(dep));
  }

  unwatch (path) {
    console.log('unwatching', path);
    let dep = this._data[path];
    console.log(this._data);
    // Seems that we do not have a target to unwatch
    if (!dep) { return; }
    console.log('triggering close');
    dep.watcher.close();
    delete this._data[path];
  }

  addMultipleIfNeeded (deps) {
    console.log('asd', this._data);
    _.each(deps, (dependency) => {
      let path = dependency.path;
      // That path is already added.
      if (this._data[path]) return;
      this._data[path] = {
        dependency: dependency,
        watcher: buildWatcher(this._hub, dependency)
      };
    });
  }
}

module.exports = DependenciesStore;
