var agents = {};
var Db = require('./src/Db'),
    Storage = require('./src/Storage'),
    Http = require('./src/Http'),
    Cache = require('./impl/cache').Cache;


exports = module.exports = function (obj) {
    obj = parseOption(obj);
    var protocol = obj.protocol;
    if (protocol[protocol.length - 1] !== ':') {
        obj.protocol = protocol + ':';
    } else {
        protocol = protocol.substr(0, protocol.length - 1);
    }
    var hash = obj.protocol + '://' + obj.username + ':' + obj.password + '@' + obj.host + ':' + obj.port + '/' + obj.resource;
    if (agents.hasOwnProperty(hash)) {
        return agents[hash];
    }

    var arr = obj.clusters;
    if (arr && !arr.length) {
        arr = null;
        delete obj.clusters;
    }
    if (arr) {
        if (typeof arr === 'string') {
            arr = obj.clusters = arr.split('|');
        }
        arr.forEach(function (item, i, arr) {
            if (typeof item === 'string') {
                arr[i] = parseOption(protocol + '://' + item);
            }
        });
    }


    var module;

    do {
        try {
            module = require('./impl/' + protocol);
            break;
        } catch (e) {
        }
        try {
            module = require('rapid-' + protocol);
            break;
        } catch (e) {
        }
        try {
            module = require(protocol);
            break;
        } catch (e) {
        }
        throw new Error('Protocol ' + protocol + ' unrecognized, is module installed?');
    } while (0);

    var ret = module.instance(obj);
    if (ret.impl.db) {
        Db.call(ret, obj);
    }
    if (ret.impl.storage) {
        Storage.call(ret, obj);
    }
    if (ret.impl.http) {
        Http.call(ret, obj);
    }

    if (obj.cache) {
        var cache = obj.cache;
        if (!cache.impl) {
            cache = exports(cache);
        }
        Cache.wrap(ret, cache);
    }

    return ret;
};

exports.Db = Db;
exports.Storage = Storage;
exports.Http = Http;
exports.Cache = Cache;


if (global.rapid && rapid.resource) {
    rapid.config.watch('dal', function (obj) {
        for (var arr = Object.keys(obj), L = arr.length, i = 0; i < L; i++) {
            var key = arr[i];
            rapid.resource.define(key, exports(obj[key]));
        }
    });
}

var URL = require('url');
function parseOption(obj) {
    if (typeof obj === 'object') {
        return obj;
    }
    var url = URL.parse(obj, true), ret = url.query, tmp;
    ret.protocol = url.protocol.substr(0, url.protocol.length - 1);
    if (tmp = url.hostname) {
        ret.host = tmp;
    }
    if (tmp = url.port) {
        ret.port = tmp;
    }
    if (tmp = url.auth) {
        var idx = tmp.indexOf(':');
        if (idx + 1) {
            ret.user = tmp.substr(0, idx);
            ret.password = tmp.substr(idx + 1);
        } else {
            ret.user = tmp;
        }
    }
    if (tmp = url.pathname && url.pathname.substr(1)) {
        ret.resource = tmp;
    }
    return ret;
}
