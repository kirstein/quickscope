'use strict';

const assert = require('assert');

jest.dontMock('../quickscope');
jest.dontMock('lodash');

const Quickscope = require('../quickscope');
const spawn      = require('../lib/spawn');
const chokidar   = require('chokidar');
const events     = require('events');
const constants  = {
  watcher    : require('../constants/watcher-constants'),
  target     : require('../constants/target-constants'),
  deps       : require('../constants/dependency-constants'),
  quickscope : require('../constants/quickscope-constants')
};

function nthCall(nr, mock) {
  return mock.argsForCall[nr];
}

function createMockHub () {
  return {
    on   : jasmine.createSpy(),
    emit : jasmine.createSpy()
  };
}
describe('Quickscope', function() {
  beforeEach(function() {
    spawn.mockClear();
    spyOn(chokidar, 'watch').andCallFake(function() {
      return {
        on: function (evt, cb) {
          if (evt === 'add') { this.addCb = cb; }
          if (evt === 'ready') { this.readyCb = cb; }
        }.bind(this)
      };
    }.bind(this));
    spyOn(events, 'EventEmitter').andCallFake(function () {
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
    it('should throw if no cmd is defined', function() {
      assert.throws(function() {
        new Quickscope();
      }, /No cmd/);
    });

    it('should throw if no glob exists', function() {
      assert.throws(function() {
        new Quickscope('asd');
      }, /No glob/);

    });
  });

  describe('event subscribing', function() {
    beforeEach(function() {
      this.qs = new Quickscope('cmd', 'glob', {});
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
        this.qs = new Quickscope('cmd', 'glob', { cwd: 'cwd' });
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
      this.qs = new Quickscope('cmd', 'glob', { cwd: 'cwd' });
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
      this.qs = new Quickscope('cmd', 'glob', { cwd: 'cwd' });
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

  describe('#triggerCmd', function() {
    beforeEach(function() {
      spawn.mockImplementation(function () {
        return { on: function(evt, cb) { cb(); }.bind(this) };
      }.bind(this));
      this.qs = new Quickscope('cmd', 'glob', { cwd: 'cwd' });
    });

    it('should exists', function() {
      assert(this.qs.triggerCmd);
    });

    it('should throw if no dependency is given', function() {
      assert.throws(function() {
        this.qs.triggerCmd();
      }.bind(this), /dependency/);
    });

    it('should run spawn', function() {
      this.qs.triggerCmd({ targets: [ 'x', 'z' ] });
      assert(spawn.mock.calls[0]);
    });

    it('should trigger run event', function() {
      this.qs.on(constants.quickscope.QUICKSCOPE_RUN, function(targets) {
        assert.strictEqual(targets.length, 2);
        assert.strictEqual(targets[0], 'x');
        assert.strictEqual(targets[1], 'z');
      });
      this.qs.triggerCmd({
        targets: [ 'x', 'z' ]
      });
    });

    it('should pass done fn to run cmd that shows if the command has finished', function() {
      this.qs.on(constants.quickscope.QUICKSCOPE_RUN, function(targets, done) {
        done(function() { assert(true); });
      });
      this.qs.triggerCmd({
        targets: [ 'x', 'z' ]
      });
    });

    it('should pass spawn cmd and cwd', function() {
      this.qs.triggerCmd({
        targets: [ 'x', 'z' ]
      });
      let call = spawn.mock.calls[0];
      let cmd  = call[0];
      let cwd  = call[1];
      assert.strictEqual(cmd, 'cmd x z');
      assert.strictEqual(cwd, 'cwd');
    });

    describe('multiple dependencies', function() {
      it('should run spawn with all given targets', function() {
        this.qs.triggerCmd([{
          targets: [ 'x', 'z' ]
        }, {
          targets: [ 'yy', 'ab']
        }]);
        let call = spawn.mock.calls[0];
        let cmd  = call[0];
        let cwd  = call[1];
        assert.strictEqual(cmd, 'cmd x z yy ab');
        assert.strictEqual(cwd, 'cwd');
      });

      it('should trigger run event', function() {
        this.qs.on(constants.quickscope.QUICKSCOPE_RUN, function(targets) {
          assert.strictEqual(targets.length, 4);
        });
        this.qs.triggerCmd([{
          targets: [ 'x', 'z' ]
        }, {
          targets: [ 'yy', 'ab']
        }]);
      });
    });
  });
});
