'use strict';

const assert = require('assert');

jest.dontMock('../spawn');
jest.dontMock('lodash');

const spawn = require('../spawn');
const cp    = require('child_process');

describe('spawn', function() {
  it('should exist', function() {
    assert(spawn);
  });

  it('should throw if no command is passed', function() {
    assert.throws(function() {
      spawn();
    }, /command/);
  });

  it('should call cp spawn', function() {
    spyOn(cp, 'spawn');
    spawn('xxx');
    assert(cp.spawn.wasCalled);
  });

  it('should destruct cmd', function() {
    spyOn(cp, 'spawn');
    spawn('xxx zz', 'cwd');
    let lastCall = cp.spawn.mostRecentCall.args;
    let cmd    = lastCall[0];
    let params = lastCall[1];
    assert.strictEqual(cmd, 'xxx');
    assert.strictEqual(params[0], 'zz');
    assert.strictEqual(params.length, 1);
  });
});
