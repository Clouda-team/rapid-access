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

});