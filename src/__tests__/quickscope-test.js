'use strict';

const assert = require('assert');

jest.enableAutomock();
jest.dontMock('../quickscope');
jest.dontMock('lodash');

const Quickscope = require('../quickscope');
const Dependency = require('../models/dependency');
const chokidar   = require('chokidar');
const events     = require('events');
const constants  = {
  watcher    : require('../constants/watcher-constants'),
  target     : require('../constants/target-constants'),
  deps       : require('../constants/dependency-constants'),
  quickscope : require('../constants/quickscope-constants')
};

function nthCall(nr, mock) {
  return mock.calls.argsFor(nr);
}

function createMockHub () {
  return {
    on   : jasmine.createSpy(),
    emit : jasmine.createSpy()
  };
}
describe('Quickscope', function() {
  beforeEach(function() {
    spyOn(chokidar, 'watch').and.callFake(function() {
      return {
        on: function (evt, cb) {
          if (evt === 'add') { this.addCb = cb; }
          if (evt === 'ready') { this.readyCb = cb; }
        }.bind(this)
      };
    }.bind(this));
    spyOn(events, 'EventEmitter').and.callFake(function () {
      this.hub = createMockHub();
      return this.hub;
    }.bind(this));
  });

  it('should exist', function() {
    assert(Quickscope);
  });

  it('should have default opts', function() {
    assert(Quickscope.DEFAULT_OPTS);
  });

  describe('initiation', function() {
    it('should throw if no glob exists', function() {
      assert.throws(function() {
        new Quickscope();
      }, /No glob/);
    });
  });

  describe('event subscribing', function() {
    beforeEach(function() {
      this.qs = new Quickscope('glob', {});
    });

    it('should subscribe to event hub dependency changed event', function() {
      assert.strictEqual(nthCall(0, this.hub.on)[0], constants.watcher.DEPENDENCY_FILE_CHANGED);
    });

    it('should subscribe to event hub multiple dependency dirty event', function() {
      assert.strictEqual(nthCall(1, this.hub.on)[0], constants.deps.MULTIPLE_DENENDENCY_DIRTY);
    });

    describe('ready event', function() {
      beforeEach(function() {
        this.runner = chokidar.watch();
        this.qs = new Quickscope('glob', { cwd: 'cwd' });
      });

      it('should trigger ready if chokidar has triggered ready event', function() {
        this.qs.on(constants.quickscope.QUICKSCOPE_READY, function () {
          assert(true);
        });
        this.readyCb();
      });

      it('should add watching files as params', function() {
        this.qs.on(constants.quickscope.QUICKSCOPE_READY, function (files) {
          assert.strictEqual(files.length, 1);
          assert.strictEqual(files[0], 'kala');
        });
        this.addCb('kala');
        this.readyCb();
      });
    });
  });

  describe('#addTarget', function() {
    beforeEach(function() {
      this.qs = new Quickscope('glob', { cwd: 'cwd' });
    });

    it('should exist', function() {
      assert(this.qs.addTarget);
    });

    it('should throw if no target is given', function() {
      assert.throws(function() {
        this.qs.addTarget();
      }.bind(this), /target defined/);
    });

    it('should emit file added event', function() {
      this.qs.addTarget('test');
      assert.strictEqual(nthCall(0, this.hub.emit)[0], constants.target.TARGET_ADDED);
    });

    it('should add the correct payload to file added event', function() {
      this.qs.addTarget('target');
      let payload = nthCall(0, this.hub.emit)[1];
      assert.strictEqual(payload.cwd, 'cwd');
      assert.strictEqual(payload.path, 'target');
    });

    it('should trigger quickscope target add event', function() {
      this.qs.on(constants.quickscope.QUICKSCOPE_TARGET_ADD, function(target) {
        assert.strictEqual(target, 'target');
      });
      this.qs.addTarget('target');
    });
  });

  describe('#unlinkTarget', function() {
    beforeEach(function() {
      this.qs = new Quickscope('glob', { cwd: 'cwd' });
    });

    it('should exist', function() {
      assert(this.qs.unlinkTarget);
    });

    it('should throw if no target is given', function() {
      assert.throws(function() {
        this.qs.unlinkTarget();
      }.bind(this), /target defined/);
    });

    it('should emit file removed event', function() {
      this.qs.unlinkTarget('test');
      assert.strictEqual(nthCall(0, this.hub.emit)[0], constants.target.TARGET_REMOVED);
    });

    it('should add the correct payload to file added event', function() {
      this.qs.unlinkTarget('target');
      let payload = nthCall(0, this.hub.emit)[1];
      assert.strictEqual(payload, 'cwd/target');
    });

    it('should trigger quickscope target unlink event', function() {
      this.qs.on(constants.quickscope.QUICKSCOPE_TARGET_UNLINK, function(target) {
        assert.strictEqual(target, 'target');
      });
      this.qs.unlinkTarget('target');
    });
  });

  describe('#changeDependency', function() {
    beforeEach(function() {
      this.qs = new Quickscope('glob', { cwd: 'cwd' });
    });

    it('should exist', function() {
      assert(this.qs.changeDependency);
    });

    it('should throw if dependency it not defined', function() {
      assert.throws(function() {
        this.qs.changeDependency();
      }.bind(this), /Dependency not defined/);
    });

    it('should emit target change event', function() {
      let dependency = new Dependency('path', 'cwd');
      let spy = jasmine.createSpy();
      this.qs.on(constants.quickscope.QUICKSCOPE_DEP_CHANGE, spy);
      this.qs.changeDependency(dependency);
      expect(spy).toHaveBeenCalled();
    });

    it('should emit target change event', function() {
      let dependency = new Dependency('path', 'cwd');
      this.qs.on(constants.quickscope.QUICKSCOPE_DEP_CHANGE, function (targets) {
        assert.strictEqual(targets[0], dependency);
      });
      this.qs.changeDependency(dependency);
    });

    it('should emit target change event if there are multiple targets', function() {
      let dependency  = new Dependency('path', 'cwd');
      let dependency1 = new Dependency('path1', 'cwd');
      this.qs.on(constants.quickscope.QUICKSCOPE_DEP_CHANGE, function (targets) {
        assert.strictEqual(targets[0], dependency);
        assert.strictEqual(targets[1], dependency1);
      });
      this.qs.changeDependency([dependency, dependency1]);
    });
  });
});
