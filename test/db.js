var assert = require('assert');

process.argv = ['node', __filename];
require('rapid-core');
require('../');

rapid.autoConfig();


describe('mysql', function () {
    this.timeout(3000);
    var db;
    it('wait for appdb ready', function (next) {
        rapid.resource.watch('appdb', function ($db) {
            db = $db;
            db.query('select 1+1 as result').then(function (result) {
                assert.deepEqual(result, [
                    {result: 2}
                ]);
                return db.query(
                        'CREATE table if not exists test(' +
                        '  id int unsigned auto_increment PRIMARY KEY,' +
                        '  name varchar(32),' +
                        '  gid int unsigned)'
                );
            }).then(function () {
                next();
            }).done();
        });
    });

    var id;
    it('insert', function (next) {
        db.insert('test', {name: 'test_dal_db', gid: 1000}).then(function (ret) {
            assert(ret.affectedRows === 1);
            id = ret.insertId;
            next();
        }).done();
    });

    it('find', function (next) {
        db.find('test', {id: id}).then(function (ret) {
            assert.deepEqual(ret, [
                {id: id, name: 'test_dal_db', gid: 1000}
            ]);
            next();
        }).done();
    });
    it('update', function (next) {
        db.update('test', {gid: 1001}, {where: {id: id}}).then(function (ret) {
            assert(ret.affectedRows === 1);
            return db.find('test', {id: id});
        }).then(function (ret) {
            assert.deepEqual(ret, [
                {id: id, name: 'test_dal_db', gid: 1001}
            ]);
            next();
        }).done();
    });

    it('get', function (next) {
        db.get('test.' + id).then(function (ret) {
            assert.deepEqual(ret, {id: id, name: 'test_dal_db', gid: 1001});
            next();
        }).done();
    });

    it('set', function (next) {
        db.set('test.' + id, {name: 'test_dal_storage', gid: 1002}).then(function () {
            return db.get('test.' + id);
        }).then(function (ret) {
            assert.deepEqual(ret, {id: id, name: 'test_dal_storage', gid: 1002});
            next();
        }).done();
    });
});