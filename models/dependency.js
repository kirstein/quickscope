'use strict';

const _ = require('lodash');

class Dependency {
    /**
     * @param {string} path path of the dependency
     * @param {string} cwd project cwd where the given dependency lives
     */
    constructor(path, cwd) {
        if (!path) throw new Error('No dependency path defined');
        if (!cwd) throw new Error('No cwd defined');
        this.cwd = cwd;
        this.path = path;
        this.targets = [];
    }

    /**
     * @param {string} target add new target to the given dependency
     */
    addTarget(target) {
        if (this.hasTarget(target)) return;
        if (this.isTarget()) throw new Error('Dependency is already a target. Target can have only one target.');
        this.targets.push(target);
    }

    /**
     * @param {string} target remove target from dependency
     * @return {boolean} true
     */
    removeTarget(target) {
        if (!this.hasTarget(target)) return false;
        this.targets = _.without(this.targets, target);
        return true;
    }

    /**
     * Checks if the given dependency has a target or not
     *
     * @param {string} target target to search
     * @return {boolean} true if target exists, otherwise false
     */
    hasTarget(target) {
        return _.includes(this.targets, target);
    }

    /**
     * Checks if we are dealing with a target
     *
     * @return {boolean} true if we are dealing with a target, otherwise false
     */
    isTarget() {
        return this.path === _.first(this.targets);
    }
}

module.exports = Dependency;
