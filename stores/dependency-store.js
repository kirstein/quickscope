'use strict';

const _ = require('lodash');
const dTree = require('dependency-tree');
const path = require('path');

const Dependency = require('../models/dependency');

const constants = {
    deps: require('../constants/dependency-constants'),
    target: require('../constants/target-constants'),
    watcher: require('../constants/watcher-constants')
};

/**
 * Will fetch paths dependencies
 *
 * @param {Object} payload target payload
 * @param {string} payload.cwd root folder for the project
 * @param {string} payload.path relative or absolute path for the given path
 * @return {Array.<Array.<string>>} dependency tree
 */
function findDependencyList(payload) {
    return dTree.toList({
        directory: payload.cwd,
        filter: loc => loc.indexOf('node_modules') === -1,
        filename: path.resolve(payload.cwd, payload.path)
    });
}

class DependenciesStore {
    /**
     * @param {Hub} hub target hub to trigger events on
     */
    constructor(hub) {
        this._hub = hub;
        this._dependencies = {};
        this._cache = {};
        this._registerEvents();
    }

    /**
     * Register on hub events
     */
    _registerEvents() {
        this._hub.on(constants.target.TARGET_ADDED, this.addTarget.bind(this));
        this._hub.on(constants.target.TARGET_REMOVED, this.removeTarget.bind(this));
        this._hub.on(constants.watcher.DEPENDENCY_FILE_CHANGED, this.changeDependency.bind(this));
        this._hub.on(constants.watcher.DEPENDENCY_FILE_UNLINK, this.removeDependency.bind(this));
    }

    /**
     * Delete dependency from the dependencies list
     *
     * @param {string} fullPath target path
     */
    _deleteDependency(fullPath) {
        delete this._dependencies[fullPath];
    }

    /**
     * Find orphans that the given dependency has.
     * Will go through all dependency targets and figure out if they have orphan nodes or not
     *
     * When going through the dependency list then update current target dependencies
     *
     * @param {Dependency} dependency target dependency
     * @return {Array.<string>} orphan dependency paths
     */
    _findOrphans(dependency) {
        const cwd = dependency.cwd;
        // Go through dependency targets to see if those targets
        // have dropped any of their dependencies
        return _.reduce(dependency.targets, (result, target) => {
            // Update dependency list for the target itself
            const deps = findDependencyList({ cwd: cwd, path: target });
            // Get the list of dropped dependencies.
            // Cache represents old dependencies, if this list is longer then we have a issue
            const excluded = _.difference(this._cache[target], deps);
            this._cache[target] = deps;
            if (!excluded.length) return result;
            return _.union(result, _.filter(excluded, (res) => this._isOrphan(res)));
        }, []);
    }

    /**
     * Kills all orphan dependencies
     *
     * @param {Array.<string>} orphans orphan dependency paths
     */
    _killOrphans(orphans) {
        if (orphans.length) {
            _.each(orphans, (orphan) => this._deleteDependency(orphan));
            this._hub.emit(constants.deps.MULTIPLE_DEPENDENCY_UNWATCH, orphans);
        }
    }

    /**
     * Build dependency list for the given paths
     *
     * @param {Array.<Dependency>} dependencies list of dependencies
     * @param {string} target target
     * @param {string} cwd dependency root
     * @return {Array.<Dependency>} list of dependencies
     */
    _buildDependencyList(dependencies, target, cwd) {
        const deps = this._dependencies;
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

    /**
     * Checks if the dependency is a orphan or not
     *
     * @param {string} fullPath path of the given dependency
     * @return {boolean} true if the dependency is orphan
     */
    _isOrphan(fullPath) {
        const orphanModel = this._dependencies[fullPath];
        // Orphan has only one target and we know that target.
        return orphanModel.targets.length === 1;
    }

    /**
     * @return {Array.<Dependency>} list of dependencies
     */
    getDependencies() {
        return this._dependencies;
    }

    /**
     * @param {Object} target target to add
     * @param {string} target.cwd target root dir
     * @param {string} target.path targets file path
     */
    addTarget(target) {
        if (!target) throw new Error('No target defined');
        const fullPath = path.join(target.cwd, target.path);
        const deps = findDependencyList(target);
        const dependencies = this._buildDependencyList(deps, fullPath, target.cwd);
        this._hub.emit(constants.deps.MULTIPLE_DEPENDENCY_ADDED, dependencies);
    }

    /**
     * @param {Dependency} dep dependency to remove
     */
    removeDependency(dep) {
        if (!dep) throw new Error('No dependency defined');
        if (dep.isTarget()) return;
        const deps = _.map(dep.targets, (target) => this._dependencies[target]);
        this._hub.emit(constants.deps.MULTIPLE_DENENDENCY_DIRTY, deps);
    }

    /**
     * @param {Dependency} dep dependency to change
     */
    changeDependency(dep) {
        if (!dep) throw new Error('No dependency defined');
        const deps = findDependencyList(dep);
        this._killOrphans(this._findOrphans(dep)); // Die bastards. Die
        const modifiedDeps = _.reduce(dep.targets, (res, target) => {
            return _.union(res, this._buildDependencyList(deps, target, dep.cwd));
        }, []);
        this._hub.emit(constants.deps.MULTIPLE_DEPENDENCY_CHANGED, modifiedDeps);
    }

    /**
     * Removes target from dependencies
     *
     * @param {string} fullPath full path of the target
     */
    removeTarget(fullPath) {
        if (!fullPath) throw new Error('No target defined');
        const removed = _.reduce(this._dependencies, (carry, val, key) => {
            if (key === fullPath || val.removeTarget(fullPath)) {
                this._deleteDependency(key);
                carry.push(key);
            }
            return carry;
        }, []);
        if (removed.length) this._hub.emit(constants.deps.DEPENDENCY_UNWATCH, path);
    }
}

module.exports = DependenciesStore;
