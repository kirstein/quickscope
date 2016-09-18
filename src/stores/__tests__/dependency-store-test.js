'use strict';

const assert       = require('assert');
const dTree        = require('dependency-tree');

jest.enableAutomock();
jest.dontMock('../dependency-store');
jest.dontMock('../../models/dependency');
jest.dontMock('../../lib/get-excluded');
jest.dontMock('lodash');

const DependenciesStore = require('../dependency-store');
const constants = {
  watcher : require('../../constants/watcher-constants'),
  target  : require('../../constants/target-constants'),
  deps    : require('../../constants/dependency-constants')
};

function createMockHub () {
  return {
    on: jasmine.createSpy(),
    emit: jasmine.createSpy()
  };
}

function nthCall(nr, mock) {
  return mock.calls.argsFor(nr);
}

describe('dependency-store', function() {
  beforeEach(function() {
    dTree._mockDeps = [];
    this.hub   = createMockHub();
    this.store = new DependenciesStore(this.hub);
  });

  describe('#getDependencies', function() {
    it('should exists', function() {
      this.store = new DependenciesStore(createMockHub());
      assert(this.store.getDependencies);
    });
  });

  describe('event registering', function() {

    it('should register to add file event', function() {
      assert.strictEqual(nthCall(0, this.hub.on)[0], constants.target.TARGET_ADDED);
    });

    it('should register to file remove event', function() {
      assert.strictEqual(nthCall(1, this.hub.on)[0], constants.target.TARGET_REMOVED);
    });

    it('should register to dependency change file event', function() {
      assert.strictEqual(nthCall(2, this.hub.on)[0], constants.watcher.DEPENDENCY_FILE_CHANGED);
    });

    it('should register to dependency remove change file event', function() {
      assert.strictEqual(nthCall(3, this.hub.on)[0], constants.watcher.DEPENDENCY_FILE_UNLINK);
    });
  });

  describe('add file', function() {

    it('should throw if no payload is added', function() {
      assert.throws(function() {
        this.store.addTarget();
      }.bind(this), /target defined/);
    });

    it('should add deps to deps', function() {
      dTree._mockDeps = [ 'one', 'two' ];
      this.store.addTarget({
        cwd: __dirname,
        path: 'xxx'
      });
      let deps = this.store.getDependencies();
      assert(deps.one);
      assert(deps.two);
    });

    it('should add target locations to deps', function() {
      dTree._mockDeps = [ 'one', 'two' ];
      this.store.addTarget({
        cwd: __dirname,
        path: 'one'
      });
      let one = this.store.getDependencies().one;
      assert.strictEqual(one.targets.length, 1);
    });

    it('should target multiple target locations to one dep', function() {
      dTree._mockDeps = [ 'one' ];
      this.store.addTarget({
        cwd: 'loc2',
        path: 'xxx'
      });
      this.store.addTarget({
        cwd: 'loc1',
        path: 'xxx'
      });
      let one = this.store.getDependencies().one;
      assert.strictEqual(one.targets.length, 2);
    });

    it('should trigger dependency added event', function() {
      dTree._mockDeps = [ 'one' ];
      this.store.addTarget({
        cwd: 'loc2',
        path: 'xxx'
      });

      assert.strictEqual(nthCall(0, this.hub.emit)[0], constants.deps.MULTIPLE_DEPENDENCY_ADDED);
    });
  });

  describe('change depdencny', function() {

    it('should throw if no dependency is added', function() {
      assert.throws(function() {
        this.store.changeDependency();
      }.bind(this), /No dependency/);
    });

    it('should add changed target locations to deps', function() {
      dTree._mockDeps = [ 'add' ];
      this.store.addTarget({
        cwd: __dirname,
        path: 'zzz'
      });
      dTree._mockDeps = [ 'add', 'change' ];
      this.store.changeDependency({
        cwd: __dirname,
        path: 'zzz',
        targets: [ __dirname + '/zzz' ]
      });
      let add = this.store.getDependencies().add;
      let change = this.store.getDependencies().change;
      assert.strictEqual(add.targets.length, 1);
      assert.strictEqual(change.targets.length, 1);
    });

    it('should trigger dependency change event', function() {
      dTree._mockDeps = [ 'one' ];
      this.store.addTarget({
        cwd: __dirname,
        path: 'xx',
      });
      dTree._mockDeps = [ 'one', 'two' ];
      this.store.changeDependency({
        cwd: __dirname,
        path: 'xx',
        targets: [ __dirname + '/xx' ]
      });
      assert.strictEqual(nthCall(1, this.hub.emit)[0], constants.deps.MULTIPLE_DEPENDENCY_CHANGED);
    });

    it('should pass the change dependencies as event payload', function() {
      dTree._mockDeps = [ 'one' ];
      this.store.addTarget({
        cwd: __dirname,
        path: 'xx',
      });
      dTree._mockDeps = [ 'one', 'two' ];
      this.store.changeDependency({
        cwd: __dirname,
        path: 'xx',
        targets: [ __dirname + '/xx' ]
      });
      assert.strictEqual(nthCall(1, this.hub.emit)[1].length, 2);
    });

    describe('killing orphans', function() {
      it('should remove dependencies that have no dependency link to target', function() {
        dTree._mockDeps = [ 'add' ];
        this.store.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ 'change' ];
        this.store.changeDependency({
          cwd: __dirname,
          path: 'xxx',
          targets: []
        });
        assert(!this.store.getDependencies().change);
      });

      xit('should remove dependencies subtrees that arent linked to target', function() {
        dTree._mockDeps = [ 'linked' ];
        this.store.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ 'linked', 'one', 'two' ];
        this.store.changeDependency({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert(this.store.getDependencies().linked);
        dTree._mockDeps = [ 'two' ];
        this.store.changeDependency({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert(!this.store.getDependencies().linked);
        assert(!this.store.getDependencies().one);
      });

      it('should not remove dependency if its used by two targets and one drops it', function() {
        dTree._mockDeps = [ 'notDropped' ];
        this.store.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        this.store.addTarget({
          cwd: __dirname,
          path: 'xxx',
        });
        dTree._mockDeps = [ ];
        this.store.changeDependency({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/xxx' ]
        });
        assert(this.store.getDependencies().notDropped);
      });

      it('should trigger unwatch event if there are orphans', function() {
        dTree._mockDeps = [ 'add' ];
        this.store.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ ];
        this.store.changeDependency({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert.strictEqual(nthCall(1, this.hub.emit)[0], constants.deps.MULTIPLE_DEPENDENCY_UNWATCH);
      });

      it('should add dependencies as payload', function() {
        dTree._mockDeps = [ 'add' ];
        this.store.addTarget({
          cwd: __dirname,
          path: 'zzz'
        });
        dTree._mockDeps = [ ];
        this.store.changeDependency({
          cwd: __dirname,
          path: 'xxx',
          targets: [ __dirname + '/zzz' ]
        });
        assert.strictEqual(nthCall(1, this.hub.emit)[1][0], 'add');
      });
    });
  });

  describe('remove target', function() {
    it('should throw if no payload is added', function() {
      assert.throws(function() {
        this.store.removeTarget();
      }.bind(this), /No target/);
    });

    it('should go through dependency list and remove itself from all dependencies', function() {
      dTree._mockDeps = [ 'add' ];
      this.store.addTarget({
        path: 'xxx',
        cwd: __dirname
      });
      this.store.removeTarget('xxx');
      assert(!this.store.getDependencies().xxx);
    });

    it('should trigger dependencys removed event', function() {
      dTree._mockDeps = [ 'xxx' ];
      this.store.addTarget({
        cwd: __dirname,
        path: 'xxx'
      });
      this.store.removeTarget('xxx');
      assert.strictEqual(nthCall(1, this.hub.emit)[0], constants.deps.DEPENDENCY_UNWATCH);
    });

    it('shouldnt trigger removed event if no dependencys were removed', function() {
      dTree._mockDeps = [ 'not-included' ];
      this.store.addTarget({
        cwd: __dirname,
        path: 'xxx'
      });
      this.store.removeTarget('xxx');
      assert(!this.hub.emit.calls[1]);
    });
  });

  describe('remove depdency', function() {
    it('should throw if no payload is added', function() {
      assert.throws(function() {
        this.store.removeDependency();
      }.bind(this), /dependency/);
    });

    it('should trigger multiple dependency dirty event', function() {
      let targetPath = __dirname + '/xxx';
      dTree._mockDeps = [ targetPath, 'kala' ];
      this.store.addTarget({
        cwd: __dirname,
        path: 'xxx'
      });
      this.store.removeDependency(this.store.getDependencies().kala);
      assert.strictEqual(nthCall(1, this.hub.emit)[0], constants.deps.MULTIPLE_DENENDENCY_DIRTY);
    });
  });
});
