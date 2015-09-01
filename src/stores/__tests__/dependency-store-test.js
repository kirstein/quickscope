'use strict';

const assert = require('assert');
const dTree  = require('dependency-tree');

jest.dontMock('../dependency-store');
jest.dontMock('../../models/dependency');
jest.dontMock('../../lib/get-excluded');
jest.dontMock('lodash');

const store      = require('../dependency-store');
const hub        = require('../../event-hub');
const constants  = {
  watcher : require('../../constants/watcher-constants'),
  target  : require('../../constants/target-constants'),
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
      assert.strictEqual(hub.on.mock.calls[0][0], constants.target.TARGET_ADDED);
    });

    it('should register to file remove event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[1][0], constants.target.TARGET_REMOVED);
    });

    it('should register to dependency change file event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[2][0], constants.watcher.DEPENDENCY_FILE_CHANGED);
    });

    it('should register to dependency remove change file event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[3][0], constants.watcher.DEPENDENCY_FILE_UNLINK);
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
        dTree._mockDeps = [ 'change' ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: []
        });
        assert(!store.getDependencies().change);
      });

      it('should remove dependencies subtrees that arent linked to target', function() {
        dTree._mockDeps = [ 'linked' ];
        this.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ 'linked', 'one', 'two' ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert(store.getDependencies().linked);
        dTree._mockDeps = [ 'two' ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert(!store.getDependencies().linked);
        assert(!store.getDependencies().one);
      });

      it('should not remove dependency if its used by two targets and one drops it', function() {
        dTree._mockDeps = [ 'notDropped' ];
        this.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        this.addTarget({
          cwd: __dirname,
          path: 'xxx',
        });
        dTree._mockDeps = [ ];
        this.changeDep({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/xxx' ]
        });
        assert(store.getDependencies().notDropped);
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
        assert.strictEqual(hub.emit.mock.calls[1][0], constants.deps.MULTIPLE_DEPENDENCY_UNWATCH);
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
      assert.strictEqual(hub.emit.mock.calls[1][0], constants.deps.DEPENDENCY_UNWATCH);
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

  describe('remove depdency', function() {
    beforeEach(function() {
      store._registerEvents();
      this.addTarget = hub.on.mock.calls[0][1];
      this.changeDep = hub.on.mock.calls[2][1];
      this.removeDep = hub.on.mock.calls[3][1];
    });

    it('should throw if no payload is added', function() {
      assert.throws(function() {
        this.removeDep();
      }.bind(this), /payload/);
    });

    it('should go through change on each dependency target', function() {
      let targetPath = __dirname + '/xxx';
      dTree._mockDeps = [ targetPath, 'kala' ];
      this.addTarget({
        cwd: __dirname,
        path: 'xxx'
      });
      hub.emit.mockClear();
      this.removeDep(store.getDependencies().kala);
      assert.strictEqual(hub.emit.mock.calls[0][1], store.getDependencies()[targetPath]);
    });
  });
});
