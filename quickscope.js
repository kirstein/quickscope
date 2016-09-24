'use strict';

const events = require('events');
const path = require('path');
const _ = require('lodash');
const chokidar = require('chokidar');
const debug = require('debug')('quickscope:main');

const constants = {
    watcher: require('./constants/watcher-constants'),
    target: require('./constants/target-constants'),
    deps: require('./constants/dependency-constants'),
    quickscope: require('./constants/quickscope-constants')
};

const DependenciesStore = require('./stores/dependency-store');
const WatchersStore = require('./stores/watchers-store');

const DEFAULT_OPTS = {
    persistent: true,
    alwaysStat: false,
    followSymlinks: true,
    cwd: process.cwd()
};

/**
 * @param {string} glob glob to watch
 * @param {Object} opts additional params
 * @return {Watcher}
 */
function buildWatcher(glob, opts) {
    debug('Building watcher glob: %s, opts: %o', glob, opts);
    return chokidar.watch(glob, opts);
}

class Quickscope extends events.EventEmitter {

    /**
     * @param {string} glob glob
     * @param {object} opts additional params
     */
    constructor(glob, opts) {
        if (!glob) throw new Error('No glob defined');
        debug('Initializing quickscope');
        opts = _.assign({}, DEFAULT_OPTS, opts);
        super();
        this.cwd = opts.cwd;
        this._hub = new events.EventEmitter();
        this._targets = [];
        this._initStores();
        this._addHubListeners();
        this._addWatcherListeners(buildWatcher(glob, opts));
    }

    /**
     * Initiates stores
     */
    _initStores() {
        this._depStore = new DependenciesStore(this._hub);
        this._watchersStore = new WatchersStore(this._hub);
    }

    /**
     * @param {Watcher} watcher watcher to bind events on
     */
    _addWatcherListeners(watcher) {
        watcher.on('add', this.addTarget.bind(this));
        watcher.on('ready', this._triggerReady.bind(this));
        watcher.on('unlink', this.unlinkTarget.bind(this));
    }

    /**
     * Adds hubs listeners.
     *
     * Hub is the event bus between stores and the quickscope itself
     */
    _addHubListeners() {
        this._hub.on(constants.watcher.DEPENDENCY_FILE_CHANGED, this.changeDependency.bind(this));
        this._hub.on(constants.deps.MULTIPLE_DENENDENCY_DIRTY, this.changeDependency.bind(this));
    }

    /**
     * Trigger ready event on itself.
     *
     * This given event is emitted when the quickscope is in the following state:
     *  - parsed AST and found all dependencies
     *  - initiated watchers on all necessary files
     *  - waiting for file changes
     */
    _triggerReady() {
        this.emit(constants.quickscope.QUICKSCOPE_READY, this._targets);
    }

    /**
     * Adds target a new entry point to the mix
     * Triggers `QUICKSCOPE_TARGET_ADD`.
     *
     * @param {string} target target to add
     */
    addTarget(target) {
        debug('Adding target: %s', target);
        if (!target) throw new Error('No target defined');
        this._targets.push(target);
        this._hub.emit(constants.target.TARGET_ADDED, {
            path: target,
            cwd: this.cwd
        });
        this.emit(constants.quickscope.QUICKSCOPE_TARGET_ADD, target);
    }

    /**
     * Unlink target file
     * Triggers `QUICKSCOPE_TARGET_UNLINK` event
     *
     * @param {string} target target to unlink
     */
    unlinkTarget(target) {
        debug('Unlinking target: %s', target);
        if (!target) throw new Error('No target defined');
        this._targets = _.without(this._targets, target);
        this._hub.emit(constants.target.TARGET_REMOVED, path.join(this.cwd, target));
        this.emit(constants.quickscope.QUICKSCOPE_TARGET_UNLINK, target);
    }

    /**
     * Will be triggered when the one of the dependency has been changed
     *
     * @param {Dependency} dep target dependency
     */
    changeDependency(dep) {
        debug('Changing dependency %o', dep);
        if (!dep) throw new Error('Dependency not defined');
        this.emit(constants.quickscope.QUICKSCOPE_DEP_CHANGE, [].concat(dep));
    }
}

Quickscope.DEFAULT_OPTS = DEFAULT_OPTS;
module.exports = Quickscope;
