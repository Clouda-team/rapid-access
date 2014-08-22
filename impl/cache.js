var Lru = require('lru-cache'),
    Q = require('q');

exports.instance = function (options) {
    return new Cache(options);
};

exports.Cache = Cache;

function Cache(options) {
    var lru = Lru(options);
    return {
        impl: {storage: true},
        get: function (key) {
            return resolved(lru.get(key));
        },
        set: function (key, value) {
            lru.set(key, value);
            return resolved();
        }
    };

    function resolved(val) {
        var deferred = Q.defer();
        deferred.resolve(val);
        return deferred.promise;
    }
}


Cache.wrap = function (obj, cache) {
    if (obj.impl.storage || obj.impl.http) {
        var $get = obj.get;
        obj.get = function (key, options) {
            if (options && options.noCache) {
                return  $get.call(obj, key, options);
            }
            return cache.get(key, options).then(function (ret) {
                if (ret !== undefined) {
                    return ret;
                }
                return $get.call(obj, key, options).then(function (ret) {
                    cache.set(key, ret);
                    return ret;
                });
            });
        };
        if (obj.impl.storage) {
            var $set = obj.set;
            obj.set = function (key, val, options) {
                cache.set(key, val, options);
                return $set.apply(obj, arguments);
            };
        }
    }

    if (obj.impl.db) {
        var $find = obj.find;
        obj.find = function (tbl, where, options) {
            if (options && options.noCache) {
                return $find.apply(obj, arguments);
            }
            var key = tbl + JSON.stringify(where);
            return cache.get(key, options).then(function (ret) {
                if (ret !== undefined) {
                    return ret;
                }
                return $find.call(tbl, where, options).then(function (ret) {
                    cache.set(key, ret);
                    return ret;
                });
            });
        };
    }

};