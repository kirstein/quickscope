'use strict';

const assert = require('assert');

jest.dontMock('../runner');
jest.dontMock('lodash');

const Runner           = require('../runner');
const hub              = require('../event-hub');
const watcherConstants = require('../constants/watcher-constants');
const cp               = require('child_process');

describe('Runner', function() {
  beforeEach(function() {
    hub.on.mockClear();
  });

  it('should exist', function() {
    assert(Runner);
  });

  describe('initiation', function() {
    it('should add cmd', function() {
      let runner = new Runner('cmd');
      assert.strictEqual(runner.cmd, 'cmd');
    });

    it('should add watcher', function() {
      let watcher = 'test wtacher';
      let runner  = new Runner('cmd', watcher);
      assert.strictEqual(runner.watcher, watcher);
    });

    it('should subscribe to event hub dependency changed event', function() {
      new Runner();
      assert.strictEqual(hub.on.mock.calls[0][0], watcherConstants.DEPENDENCY_CHANGED);
    });
  });

  describe('#triggerCmd', function() {
    it('should exists', function() {
      let runner = new Runner();
      assert(runner.triggerCmd);
    });

    it('should throw if no dependency is given', function() {
      let runner = new Runner();
      assert.throws(function() {
        runner.triggerCmd();
      });
    });

    it('should run execSync', function() {
      spyOn(cp, 'spawn').andReturn({
        stdout: {
          setEncoding: function(){},
          on: function(){}
        },
        stderr: {
          setEncoding: function(){},
          on: function(){}
        }
      });
      let runner = new Runner();
      let path   = 'path xxx';
      runner.triggerCmd({path: path, targets: [ 'xxx ' ]});
      assert(cp.spawn.wasCalled);
    });
  });
});
