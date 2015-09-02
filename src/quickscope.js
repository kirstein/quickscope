'use strict';

const EventEmitter = require('events').EventEmitter;
const path         = require('path');
const _            = require('lodash');

// Initiating stores
const hub       = require('./event-hub');
const spawn     = require('./lib/spawn');
const constants = {
  watcher    : require('./constants/watcher-constants'),
  target     : require('./constants/target-constants'),
  deps       : require('./constants/dependency-constants'),
  quickscope : require('./constants/quickscope-constants')
};

const DependenciesStore = require('./stores/dependency-store');
const WatchersStore     = require('./stores/watchers-store');

function buildCmd (cmd, targets) {
  return cmd + ' ' + targets.join(' ');
}

class Runner extends EventEmitter {
  constructor(cmd, cwd, watcher) {
    super();
    this.cmd     = cmd;
    this.cwd     = cwd;
    this.watcher = watcher;

    this._hub           = new EventEmitter();
    this._depStore      = new DependenciesStore(hub);
    this._watchersStore = new WatchersStore(hub);
    this._targets       = [];

    this._addListeners();
  }

  _addListeners() {
    this.watcher.on('add', this.addTarget.bind(this));
    this.watcher.on('ready', this._triggerReady.bind(this));
    this.watcher.on('unlink', this.unlinkTarget.bind(this));
    hub.on(constants.watcher.DEPENDENCY_FILE_CHANGED, this.triggerCmd.bind(this));
    hub.on(constants.deps.MULTIPLE_DENENDENCY_DIRTY, this.triggerCmd.bind(this));
  }

  _triggerReady() {
    this.emit(constants.quickscope.QUICKSCOPE_READY, this._targets);
  }

  addTarget(target) {
    if (!target) {
      throw new Error('No target defined');
    }
    this._targets.push(target);
    this.emit(constants.quickscope.QUICKSCOPE_TARGET_ADD, target);
    hub.emit(constants.target.TARGET_ADDED, {
      path: target,
      cwd : this.cwd
    });
  }

  unlinkTarget(target) {
    if (!target) {
      throw new Error('No target defined');
    }
    this._targets = _.without(this._targets, target);
    this.emit(constants.quickscope.QUICKSCOPE_TARGET_UNLINK, target);
    hub.emit(constants.target.TARGET_REMOVED, path.join(this.cwd, target));
  }

  triggerCmd(dependency) {
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

module.exports = Runner;
