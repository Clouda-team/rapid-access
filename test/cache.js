var assert = require('assert');

process.argv = ['node', __filename];
require('rapid-core');
require('../');

rapid.autoConfig();


describe('cache', function () {
    this.timeout(3000);
    var cache;
    it('wait for config ready', function (next) {
        rapid.resource.watch('cache', function ($cache) {
            cache = $cache;
            next();
        });
    });

    it('set', function (next) {
        var val = ['bar', 'Lorem ipsum'];
        cache.set('foo', val).then(function () {
            return cache.get('foo');
        }).then(function (ret) {
            assert.strictEqual(val, ret);
            next();
        }).done();
    });

    it('get empty', function (next) {
        cache.get('i.dont.exist').then(function (ret) {
            assert.strictEqual(ret, undefined);
            next();
        }).done();
    });

    it('delete', function (next) {
        cache.delete('foo').then(function () {
            return cache.get('foo');
        }).then(function (ret) {
            assert.strictEqual(ret, undefined);
            next();
        }).done();
    })

});

describe('memcache', function () {
    this.timeout(5000);
    var db;
    it('wait for config ready', function (next) {
        rapid.resource.watch('cachedDb', function ($db) {
            db = $db;
            next();
        });
    });
    it('set', function (next) {
        db.set('test.123', {name: 'cachedDB.set', gid: 234}).then(function () {
            next();
        }).done();
    });
    it('get', function (next) {
        db.get('test.123').then(function (ret) {
            assert(ret.name === 'cachedDB.set');
            assert(ret.gid === 234);
            next();
        }).done();
    });
    it('find', function (next) {
        db.find('test', {id: 123}).then(function (ret) {
            ret = ret[0];
            assert(ret.name === 'cachedDB.set');
            assert(ret.gid === 234);
            next();
        }).done();
    });
    it('update internally', function (next) {
        db.update('test', {gid: 345}, {
            where: {id: 123}
        }).then(function () {
            return db.get('test.123');
        }).then(function (ret) {
            assert(ret.name === 'cachedDB.set');
            assert(ret.gid === 234);
            next();
        }).done();
    });
    it('cached find', function (next) {
        db.find('test', {id: 123}).then(function (ret) {
            ret = ret[0];
            assert(ret.name === 'cachedDB.set');
            assert(ret.gid === 234);
            next();
        }).done();
    });
    it('find with noCache', function (next) {
        db.find('test', {id: 123}, {
            noCache: true
        }).then(function (ret) {
            ret = ret[0];
            assert(ret.name === 'cachedDB.set');
            assert(ret.gid === 345);
            next();
        }).done();
    });
});