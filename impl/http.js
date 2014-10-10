// simple http implemention
var Http = require('../').Http;
exports.instance = function (options) {
    var ret = Object.create(Http.prototype);
    ret.impl = {
        http: true
    };
    return ret;
};