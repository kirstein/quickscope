'use strict';

const assert = require('assert');

jest.dontMock('../dependency');
jest.dontMock('lodash');

const Dependency = require('../dependency');

describe('dependency model', function() {
  it('should exist', function() {
    assert(Dependency);
  });

  describe('initiation', function() {
    it('should add path', function() {
      let dep = new Dependency(__dirname, 'cwd');
      assert.strictEqual(dep.path, __dirname);
    });

    it('should add cwd', function() {
      let dep = new Dependency(__dirname, 'cwd');
      assert.strictEqual(dep.cwd, 'cwd');
    });

    it('should create a list of targets', function() {
      let dep = new Dependency(__dirname, 'cwd');
      assert(Array.isArray(dep.targets));
    });

    it('should throw if no path is given', function() {
      assert.throws(function() {
        new Dependency();
      }, /path/);
    });

    it('should throw if no cwd is given', function() {
      assert.throws(function() {
        new Dependency(__dirname);
      }, /cwd/);
    });
  });

  describe('#hasTarget', function() {
    it('should return false if no targets', function() {
      let dep    = new Dependency(__dirname, 'cwd');
      let target = 'hello';
      assert.strictEqual(dep.hasTarget(target), false);
    });

    it('should return true if target exists', function() {
      let dep    = new Dependency(__dirname, 'cwd');
      let target = 'hello';
      dep.addTarget(target);
      assert.strictEqual(dep.hasTarget(target), true);
    });
  });

  describe('#addTarget', function() {
    it('should add targets to list', function() {
      let dep    = new Dependency(__dirname, 'cwd');
      let target = 'hello';
      dep.addTarget(target);
      assert.strictEqual(dep.targets[0], target);
    });

    it('should not add duplicate targets', function() {
      let dep    = new Dependency(__dirname, 'cwd');
      let target = 'hello';
      dep.addTarget(target);
      dep.addTarget(target);
      assert.strictEqual(dep.targets.length, 1);
    });

    it('should throw if adding targets to a target', function() {
      let dep = new Dependency(__dirname, 'cwd');
      dep.addTarget(dep.path);
      assert.throws(function() {
        dep.addTarget('xxx');
      }, /already a target/);
    });
  });

  describe('#removeTarget', function() {
    it('should remove targets from list', function() {
      let dep    = new Dependency(__dirname, 'cwd');
      let target = 'hello';
      dep.addTarget(target);
      dep.removeTarget(target);
      assert(!dep.targets.length);
    });

    it('should return true if removed an element', function() {
      let dep    = new Dependency(__dirname, 'cwd');
      let target = 'hello';
      dep.addTarget(target);
      assert(dep.removeTarget(target));
    });

    it('should not remove element if its not in the list', function() {
      let dep    = new Dependency(__dirname, 'cwd');
      let target = 'hello';
      dep.addTarget(target);
      dep.removeTarget('wrong');
      assert.strictEqual(dep.targets[0], target);
    });

    it('should return false if removing was not successful', function() {
      let dep    = new Dependency(__dirname, 'cwd');
      let target = 'hello';
      dep.addTarget(target);
      assert(!dep.removeTarget('wrong'));
    });
  });

  describe('#isTarget', function() {
    it('should be target if its path is the same as targets path', function() {
      let dep = new Dependency(__dirname, 'cwd');
      dep.addTarget(dep.path);
      assert(dep.isTarget());
    });

    it('should not be target if paths differ', function() {
      let dep = new Dependency(__dirname, 'cwd');
      dep.addTarget('xxx');
      assert(!dep.isTarget());
    });
  });
});
