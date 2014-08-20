var assert = require('assert');

process.argv = ['node', __filename];
require('rapid-core');
require('../');

rapid.autoConfig();

var http;

function readBody(incoming, cb) {
    var arr = [];
    incoming.on('data', arr.push.bind(arr)).on('end', function () {
        cb(Buffer.concat(arr));
    });
}

function requestHandler(req, res) {
    if (req.method === 'GET') {
        res.end(JSON.stringify({
            method: req.method,
            url: req.url,
            headers: req.headers
        }));
    } else {
        readBody(req, function (buf) {
            res.end(JSON.stringify({
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: buf.toString()
            }));
        });
    }
}

describe('http', function () {
    this.timeout(1000);
    it('wait for server ready', function (next) {
        require('http').createServer(requestHandler).listen(8032, '127.0.0.5', function () {
            next();
        });
    });

    it('wait for config ready', function (next) {
        rapid.resource.watch('httpServer', function ($http) {
            http = $http;
            next();
        });
    });
});

describe('request', function () {
    it('basic', function (next) {
        http.request({
            method: 'GET',
            path: '/foo/bar'
        }).then(function (ret) {
            ret = JSON.parse(ret);
            assert(ret.method === 'GET');
            assert(ret.url === '/foo/bar');
            assert(ret.headers.host === '127.0.0.5:8032');
            assert.strictEqual(ret.headers.authorization, 'Basic ' + new Buffer('root:root').toString('base64'));
            next();
        }).done();
    });

    it('get', function (next) {
        http.get('/foo/bar').then(function (ret) {
            ret = JSON.parse(ret);
            assert(ret.method === 'GET');
            assert(ret.url === '/foo/bar');
            next();
        }).done();
    });

    it('getJSON', function (next) {
        http.getJSON('/foo/bar').then(function (ret) {
            assert(ret.method === 'GET');
            assert(ret.url === '/foo/bar');
            next();
        }).done();
    });
    it('postJSON', function (next) {
        var data = 'Lorem ipsum'
        http.postJSON('/foo/bar', data).then(function (ret) {
            assert.strictEqual(ret.method, 'POST');
            assert.strictEqual(ret.url, '/foo/bar');
            assert.strictEqual(ret.body, data);
            next();
        }).done();
    });
});

describe('open', function () {
    it('basic', function (next) {
        var entry = http.open({
            method: 'GET',
            path: '/foo/bar'
        });
        readBody(entry, function (ret) {
            ret = JSON.parse(ret);
            assert(ret.method === 'GET');
            assert(ret.url === '/foo/bar');
            assert(ret.headers.host === '127.0.0.5:8032');
            assert.strictEqual(ret.headers.authorization, 'Basic ' + new Buffer('root:root').toString('base64'));
            next();
        });
    });

    it('write input', function (next) {
        var entry = http.open({
            method: 'POST',
            path: '/foo/bar'
        });

        entry.write('Lorem');
        setTimeout(function () {
            entry.end(' ipsum');
        }, 20);

        readBody(entry, function (ret) {
            ret = JSON.parse(ret);
            assert(ret.method === 'POST');
            assert(ret.url === '/foo/bar');
            assert(ret.headers.host === '127.0.0.5:8032');
            assert.strictEqual(ret.body, 'Lorem ipsum');
            next();
        });
    });
    it('pipe write', function (next) {
        var content = require('fs').readFileSync(__filename);

        var entry = http.open({
            method: 'POST',
            path: '/foo/bar',
            headers: {
                'Content-Length': content.length
            }
        });

        require('fs').createReadStream(__filename).pipe(entry);

        readBody(entry, function (ret) {
            ret = JSON.parse(ret);
            assert(ret.method === 'POST');
            assert(ret.url === '/foo/bar');
            assert(ret.headers.host === '127.0.0.5:8032');
            assert.strictEqual(ret.body, content.toString());
            next();
        });
    });

    it('pipe read', function (next) {
        var entry = http.open({
            method: 'POST',
            path: '/foo/bar'
        });
        var content = require('fs').readFileSync(__filename, 'utf8');
        var data = (content = (content = (content = content + content) + content) + content) + content;
        entry.end(data);
        readBody(entry.pipe(require('zlib').createDeflateRaw()), function (buffer) {
            require('zlib').inflateRaw(buffer, function (err, ret) {
                ret = JSON.parse(ret);
                assert(ret.method === 'POST');
                assert(ret.url === '/foo/bar');
                assert.strictEqual(ret.body, data);
                next();
            })
        });
    });


});

describe('proxy http', function () {
    it('wait for proxy ready', function (next) {
        require('http').createServer(function (req, res) {
            req.headers['x-remote-addr'] = req.socket.address().address;
            req.pipe(http.open({
                method: req.method,
                path: req.url,
                headers: req.headers
            })).pipe(res);
        }).listen(8033, '127.0.0.5', function () {
            next();
        });
    });

    it('get', function (next) {
        require('http').request({
            method: 'GET',
            host: '127.0.0.5',
            port: 8033,
            agent: false
        }, function (tres) {
            readBody(tres, function (ret) {
                ret = JSON.parse(ret);
                assert.strictEqual(ret.headers['x-remote-addr'], '127.0.0.5');
                next();
            })
        }).end();
    });

    it('post', function (next) {
        var data = 'Lorem ipsum';
        require('http').request({
            method: 'POST',
            host: '127.0.0.5',
            port: 8033,
            headers: {'Content-Length': 11},
            agent: false
        }, function (tres) {
            readBody(tres, function (ret) {
                ret = JSON.parse(ret);
                assert.strictEqual(ret.headers['x-remote-addr'], '127.0.0.5');
                assert.strictEqual(ret.body, data);
                next();
            })
        }).end(data);
    });
});