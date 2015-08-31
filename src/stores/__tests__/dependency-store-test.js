'use strict';

const assert = require('assert');
const dTree  = require('dependency-tree');

jest.dontMock('../dependency-store');
jest.dontMock('../../models/dependency');
jest.dontMock('../../lib/get-excluded');
jest.dontMock('lodash');

const store     = require('../dependency-store');
const hub       = require('../../event-hub');
const constants = {
  watcher : require('../../constants/watcher-constants'),
  file    : require('../../constants/file-constants'),
  deps    : require('../../constants/dependency-constants')
};

describe('dependency-store', function() {
  beforeEach(function() {
    dTree._mockDeps = [];
    hub.emit.mockClear();
    hub.on.mockClear();
    store.clear();
  });

  it('should exist', function() {
    assert(store);
  });

  describe('#getDependencies', function() {
    it('should exists', function() {
      assert(store.getDependencies);
    });
  });

  describe('#clear', function() {
    it('should exists', function() {
      assert(store.clear);
    });

    it('should clear dependencies', function() {
      let deps = store.getDependencies();
      store.clear();
      assert.notStrictEqual(deps, store.getDependencies());
    });
  });

  describe('event registering', function() {
    it('should register to add file event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[0][0], constants.file.FILE_ADDED);
    });

    it('should register to change file event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[2][0], constants.watcher.DEPENDENCY_CHANGED);
    });
  });

  describe('add file', function() {
    beforeEach(function() {
      store._registerEvents();
      this.addTarget = hub.on.mock.calls[0][1];
    });

    it('should throw if no payload is added', function() {
      assert.throws(function() {
        this.addTarget();
      }.bind(this), /payload/);
    });

    it('should add deps to deps', function() {
      spyOn(dTree, 'toList').andReturn(['one', 'two']);
      this.addTarget({
        cwd: __dirname,
        path: 'xxx'
      });
      let deps = store.getDependencies();
      assert(deps.one);
      assert(deps.two);
    });

    it('should add target locations to deps', function() {
      spyOn(dTree, 'toList').andReturn(['one']);
      this.addTarget({
        cwd: __dirname,
        path: 'one'
      });
      let one = store.getDependencies().one;
      assert.strictEqual(one.targets.length, 1);
    });

    it('should target multiple target locations to one dep', function() {
      spyOn(dTree, 'toList').andReturn(['one']);
      this.addTarget({
        cwd: 'loc2',
        path: 'xxx'
      });
      this.addTarget({
        cwd: 'loc1',
        path: 'xxx'
      });
      let one = store.getDependencies().one;
      assert.strictEqual(one.targets.length, 2);
    });

    it('should trigger dependency added event', function() {
      spyOn(dTree, 'toList').andReturn(['one']);
      this.addTarget({
        cwd: 'loc2',
        path: 'xxx'
      });

      assert.strictEqual(hub.emit.mock.calls[0][0], constants.deps.MULTIPLE_DEPENDENCY_ADDED);
    });
  });

  describe('change depdencny', function() {
    beforeEach(function() {
      store._registerEvents();
      this.addTarget = hub.on.mock.calls[0][1];
      this.changeDep = hub.on.mock.calls[2][1];
    });

    it('should throw if no payload is added', function() {
      assert.throws(function() {
        this.changeDep();
      }.bind(this), /payload/);
    });

    it('should add changed target locations to deps', function() {
      dTree._mockDeps = [ 'add' ];
      this.addTarget({
        cwd: __dirname,
        path: 'zzz'
      });
      dTree._mockDeps = [ 'add', 'change' ];
      this.changeDep({
        cwd: __dirname,
        path: 'zzz',
        targets: [ __dirname + '/zzz' ]
      });
      let add = store.getDependencies().add;
      let change = store.getDependencies().change;
      assert.strictEqual(add.targets.length, 1);
      assert.strictEqual(change.targets.length, 1);
    });

    it('should trigger dependency change event', function() {
      dTree._mockDeps = [ 'one' ];
      this.addTarget({
        cwd: __dirname,
        path: 'xx',
      });
      dTree._mockDeps = [ 'one', 'two' ];
      this.changeDep({
        cwd: __dirname,
        path: 'xx',
        targets: [ __dirname + '/xx' ]
      });
      assert.strictEqual(hub.emit.mock.calls[1][0], constants.deps.MULTIPLE_DEPENDENCY_CHANGED);
    });

    it('should pass the change dependencies as event payload', function() {
      dTree._mockDeps = [ 'one' ];
      this.addTarget({
        cwd: __dirname,
        path: 'xx',
      });
      dTree._mockDeps = [ 'one', 'two' ];
      this.changeDep({
        cwd: __dirname,
        path: 'xx',
        targets: [ __dirname + '/xx' ]
      });
      assert.strictEqual(hub.emit.mock.calls[1][1].length, 2);
    });

    describe('killing orphans', function() {
      it('should remove dependencies that have no dependency link to target', function() {
        dTree._mockDeps = [ 'add' ];
        this.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert(!store.getDependencies().change);
      });

      it('should remove dependencies subtrees that arent linked to target', function() {
        dTree._mockDeps = [ 'linked' ];
        this.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ 'linked', 'xxx', 'zzz' ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert(store.getDependencies().linked);
        dTree._mockDeps = [ 'xxx', 'zzz' ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert(!store.getDependencies().linked);
      });

      it('should trigger unwatch event if there are orphans', function() {
        dTree._mockDeps = [ 'add' ];
        this.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert.strictEqual(hub.emit.mock.calls[1][0], constants.watcher.MULTIPLE_UNWATCH);
      });

      it('should add dependencies as payload', function() {
        dTree._mockDeps = [ 'add' ];
        this.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert.strictEqual(hub.emit.mock.calls[1][1][0], 'add');
      });
    });
  });

  describe('remove target', function() {
    beforeEach(function() {
      store._registerEvents();
      this.addTarget  = hub.on.mock.calls[0][1];
      this.removeFile = hub.on.mock.calls[1][1];
    });

    it('should throw if no payload is added', function() {
      assert.throws(function() {
        this.removeFile();
      }.bind(this), /payload/);
    });

    it('should go through dependency list and remove itself from all dependencies', function() {
      spyOn(dTree, 'toList').andReturn(['xxx']);
      this.addTarget({
        path: 'xxx',
        cwd: __dirname
      });
      this.removeFile('xxx');
      assert(!store.getDependencies().xxx);
    });

    it('should trigger dependencys removed event', function() {
      spyOn(dTree, 'toList').andReturn(['xxx']);
      this.addTarget({
        cwd: __dirname,
        path: 'xxx'
      });
      this.removeFile('xxx');
      assert.strictEqual(hub.emit.mock.calls[1][0], constants.deps.DEPENDENCY_REMOVED);
    });

    it('shouldnt trigger removed event if no dependencys were removed', function() {
      spyOn(dTree, 'toList').andReturn(['not-included']);
      this.addTarget({
        cwd: __dirname,
        path: 'xxx'
      });
      this.removeFile('xxx');
      assert(!hub.emit.mock.calls[1]);
    });
  });
});
