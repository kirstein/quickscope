'use strict';

const _ = require('lodash');

module.exports = function (arr1, arr2) {
  return _.reduce(arr1, function (old, val) {
    if (!_.contains(arr2, val)) {
      old.push(val);
    }
    return old;
  }, []);
};
