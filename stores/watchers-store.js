'use strict';

const _ = require('lodash');
const chokidar = require('chokidar');

const constants = {
    deps: require('../constants/dependency-constants'),
    watcher: require('../constants/watcher-constants')
};

/**
 * Builds watcher and links `change` and `unlink` events on that
 *
 * @param {Hub} hub hub to emit the given events to
 * @param {Dependency} dependency dependency to control
 * @return {Watcher} new build watcher
 */
function buildWatcher(hub, dependency) {
    const watcher = chokidar.watch(dependency.path);
    watcher.on('change', () => hub.emit(constants.watcher.DEPENDENCY_FILE_CHANGED, dependency));
    watcher.on('unlink', () => hub.emit(constants.watcher.DEPENDENCY_FILE_UNLINK, dependency));
    return watcher;
}

class DependenciesStore {
    /**
     * @param {Hub} hub target hub to use for event transmitting
     */
    constructor(hub) {
        this._hub = hub;
        this._data = {};
        this._registerEvents();
    }

    /**
     * Register events on target hub
     */
    _registerEvents() {
        this._hub.on(constants.deps.MULTIPLE_DEPENDENCY_ADDED, this.addMultipleIfNeeded.bind(this));
        this._hub.on(constants.deps.MULTIPLE_DEPENDENCY_CHANGED, this.addMultipleIfNeeded.bind(this));
        this._hub.on(constants.deps.DEPENDENCY_UNWATCH, this.unwatch.bind(this));
        this._hub.on(constants.deps.MULTIPLE_DEPENDENCY_UNWATCH, this.multipleUnwatch.bind(this));
    }

    /**
     * Retuns all watchers
     *
     * @return {Array.<Watcher>} watchers
     */
    getWatchers() {
        return this._data;
    }

    /**
     * Unwatch multiple dependencies
     *
     * @param {Array.<Dependency>} deps deps to unwatch
     */
    multipleUnwatch(deps) {
        _.each(deps, (dep) => this.unwatch(dep));
    }

    /**
     * Unwatch single dependency.
     * Close the watcher and delete it from watchers list
     *
     * @param {string} path watcher path
     */
    unwatch(path) {
        const dep = this._data[path];
        // Seems that we do not have a target to unwatch
        if (!dep) { return; }
        dep.watcher.close();
        delete this._data[path];
    }

    /**
     * Add multiple watchers if needed.
     * Will go through the watchers list and see if the given target is already watched.
     * If it is not the will watch that
     *
     * @param {Array.<Dependency>} deps dependencies to add
     */
    addMultipleIfNeeded(deps) {
        _.each(deps, (dependency) => {
            const path = dependency.path;
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
