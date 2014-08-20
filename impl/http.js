// simple http implemention
var Http = require('../').Http
exports.instance = function (options) {
    var ret = new Http(options);
    ret.impl = {
        http: true
    };
    return ret;
};