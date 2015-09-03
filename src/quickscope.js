'use strict';

const events   = require('events');
const path     = require('path');
const _        = require('lodash');
const chokidar = require('chokidar');

const spawn     = require('./lib/spawn');
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

function buildCmd (cmd, targets) {
  return cmd + ' ' + targets.join(' ');
}

function buildWatcher (glob, opts) {
  return chokidar.watch(glob, opts);
}

class Quickscope extends events.EventEmitter {
  constructor (cmd, glob, opts) {
    if (!cmd) { throw new Error('No cmd defined'); }
    if (!glob) { throw new Error('No glob defined'); }
    opts = _.assign({}, DEFAULT_OPTS, opts);
    super();
    this.cmd      = cmd;
    this.cwd      = opts.cwd;
    this._watcher = buildWatcher(glob, opts);
    this._hub     = new events.EventEmitter();
    this._targets = [];
    this._initStores();
    this._addHubListeners();
    this._addWatcherListeners();
  }

  _initStores () {
    this._depStore      = new DependenciesStore(this._hub);
    this._watchersStore = new WatchersStore(this._hub);
  }

  _addWatcherListeners () {
    this._watcher.on('add', this.addTarget.bind(this));
    this._watcher.on('ready', this._triggerReady.bind(this));
    this._watcher.on('unlink', this.unlinkTarget.bind(this));
  }

  _addHubListeners () {
    this._hub.on(constants.watcher.DEPENDENCY_FILE_CHANGED, this.triggerCmd.bind(this));
    this._hub.on(constants.deps.MULTIPLE_DENENDENCY_DIRTY, this.triggerCmd.bind(this));
  }

  _triggerReady () {
    this.emit(constants.quickscope.QUICKSCOPE_READY, this._targets);
  }

  addTarget (target) {
    if (!target) {
      throw new Error('No target defined');
    }
    this._targets.push(target);
    this._hub.emit(constants.target.TARGET_ADDED, {
      path: target,
      cwd : this.cwd
    });
    this.emit(constants.quickscope.QUICKSCOPE_TARGET_ADD, target);
  }

  unlinkTarget (target) {
    if (!target) {
      throw new Error('No target defined');
    }
    this._targets = _.without(this._targets, target);
    this._hub.emit(constants.target.TARGET_REMOVED, path.join(this.cwd, target));
    this.emit(constants.quickscope.QUICKSCOPE_TARGET_UNLINK, target);
  }

  triggerCmd (dependency) {
    if (!dependency) {
      throw new Error('No dependency given');
    }
    let targets = dependency.targets || _.reduce(dependency, function (res, dep) {
      return _.union(res, dep.targets);
    }, []);
    let doneFn;
    this.emit(constants.quickscope.QUICKSCOPE_RUN, targets, function (fn) {
      doneFn = fn;
    });
    spawn(buildCmd(this.cmd, targets), this.cwd).on('close', function (code) {
      if (doneFn) { doneFn(code); }
    });
  }
}

Quickscope.DEFAULT_OPTS = DEFAULT_OPTS;
module.exports = Quickscope;
