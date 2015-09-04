'use strict';

const events   = require('events');
const path     = require('path');
const _        = require('lodash');
const chokidar = require('chokidar');

const constants = {
  watcher    : require('./constants/watcher-constants'),
  target     : require('./constants/target-constants'),
  deps       : require('./constants/dependency-constants'),
  quickscope : require('./constants/quickscope-constants')
};

const DependenciesStore = require('./stores/dependency-store');
const WatchersStore     = require('./stores/watchers-store');

const DEFAULT_OPTS = {
  persistent: true,
  alwaysStat: false,
  followSymlinks: true,
  cwd: process.cwd()
};

function buildWatcher (glob, opts) {
  return chokidar.watch(glob, opts);
}

class Quickscope extends events.EventEmitter {
  constructor (glob, opts) {
    if (!glob) { throw new Error('No glob defined'); }
    opts = _.assign({}, DEFAULT_OPTS, opts);
    super();
    this.cwd      = opts.cwd;
    this._hub     = new events.EventEmitter();
    this._targets = [];
    this._initStores();
    this._addHubListeners();
    this._addWatcherListeners(buildWatcher(glob, opts));
  }

  _initStores () {
    this._depStore      = new DependenciesStore(this._hub);
    this._watchersStore = new WatchersStore(this._hub);
  }

  _addWatcherListeners (watcher) {
    watcher.on('add', this.addTarget.bind(this));
    watcher.on('ready', this._triggerReady.bind(this));
    watcher.on('unlink', this.unlinkTarget.bind(this));
  }

  _addHubListeners () {
    this._hub.on(constants.watcher.DEPENDENCY_FILE_CHANGED, this.changeDependency.bind(this));
    this._hub.on(constants.deps.MULTIPLE_DENENDENCY_DIRTY, this.changeDependency.bind(this));
  }

  _triggerReady () {
    this.emit(constants.quickscope.QUICKSCOPE_READY, this._targets);
  }

  addTarget (target) {
    if (!target) { throw new Error('No target defined'); }
    this._targets.push(target);
    this._hub.emit(constants.target.TARGET_ADDED, {
      path: target,
      cwd : this.cwd
    });
    this.emit(constants.quickscope.QUICKSCOPE_TARGET_ADD, target);
  }

  unlinkTarget (target) {
    if (!target) { throw new Error('No target defined'); }
    this._targets = _.without(this._targets, target);
    this._hub.emit(constants.target.TARGET_REMOVED, path.join(this.cwd, target));
    this.emit(constants.quickscope.QUICKSCOPE_TARGET_UNLINK, target);
  }

  changeDependency (dep) {
    if (!dep) { throw new Error('Dependency not defined'); }
    this.emit(constants.quickscope.QUICKSCOPE_DEP_CHANGE, [].concat(dep));
  }
}

Quickscope.DEFAULT_OPTS = DEFAULT_OPTS;
module.exports = Quickscope;
