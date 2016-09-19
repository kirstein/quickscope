'use strict';

exports._mockDeps = [];
exports.toList = function(/* cwd, target*/) {
    return exports._mockDeps;
};
