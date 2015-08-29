'use strict';
const assert = require('assert');

jest.dontMock('../event-hub');
jest.dontMock('events');

const hub          = require('../event-hub');
const EventEmitter = require('events').EventEmitter;

describe('events hub', function() {
  it('should exists', function() {
    assert(hub);
  });

  it('should be instanceof EventEmitter', function() {
    assert(hub instanceof EventEmitter);
  });
});
