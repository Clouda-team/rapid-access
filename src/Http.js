var Q = require('q'),
    $http = require('http'),
    $https = require('https'),
    util = require('util');

module.exports = Http;

function Http(options) {
    if (options.user) {
        options.auth = options.user + ':' + options.password;
    }

    var conf = this._conf = util._extend({}, this._conf);

    for (var keys = Object.keys(conf), n = keys.length; n--;) {
        var key = keys[n];
        if (options.hasOwnProperty(key)) {
            conf[key] = options[key];
        }
    }
    var clusters = conf.clusters, N;
    if (clusters) {
        N = clusters.length;
        clusters.forEach(function (obj) {
            obj.__proto__ = options;
            var forbidCount = obj.forbidCount || 10;
            obj.forbidCount = N === 1 ? 0 : forbidCount / (N - 1);
            obj.forbidden = 0;
            obj.slave = !!obj.slave;
        });
    }

    var http = options.protocol === 'https:' ? $https : $http;

    options.agent = new http.Agent({maxSockets: conf.maxConnects});

    var connects = 0;
    this._context = {
        request: clusters ? function (obj, resolve, reject) {
            retry(conf.maxRetries);

            function retry(retries) {
                var option;
                for (; ;) {
                    option = clusters[connects++ % N];
                    if (option.forbidden) {
                        option.forbidden--;
                    } else {
                        break;
                    }
                }
                obj.__proto__ = options;
                var req = http.request(obj);
                req.once('socket', function () {
                    resolve(req);
                }).once('error', function () {
                    option.forbidden = option.forbidCount;
                    if (retries) {
                        retry(retries - 1);
                    }
                    else {
                        reject({message: 'ECONNECT'});
                    }
                });
            }
        } : function (obj, resolve, reject) {
            obj.__proto__ = options;
            retry(conf.maxRetries);

            function retry(retries) {
                var req = http.request(obj);
                req.once('socket', function () {
                    resolve(req);
                }).once('error', function () {
                    if (retries) {
                        setTimeout(retry, conf.retryTimeout, retries - 1);
                    } else {
                        reject({message: 'ECONNECT'});
                    }
                });
            }
        }
    };
}

function readBody(incoming, cb) {
    var arr = [];
    incoming.on('data', arr.push.bind(arr)).on('end', function () {
        cb(Buffer.concat(arr));
    });
}
var Readable = require('stream').Readable;

function Entry(options, http) {
    Readable.call(this);
    var self = this;
    self.write = write;
    self.end = end;

    var buffers = [];

    if (options.method === 'GET') {
        end();
    } else if (options.headers && Object.keys(options.headers).some(function (name) {
        return name.toLowerCase() === 'content-length';
    })) { // content-length set
        open(function (req) {
            req.write(Buffer.concat(buffers));
            self.write = req.write.bind(req);
            self.end = req.end.bind(req);
        });

    }


    function write(chunk, encoding) {
        if (typeof chunk === 'string') {
            chunk = new Buffer(chunk, encoding);
        }
        buffers.push(chunk);
    }

    function end(chunk, encoding) {
        self.write = function () {
            throw new Error('end called');
        };
        self.end = function () {
            return false;
        };
        if (chunk) {
            write(chunk, encoding);
        }
        var data = Buffer.concat(buffers);
        var headers = options.headers || (options.headers = {});
        headers['Content-Length'] = data.length;
        open(function (req) {
            req.end(data);
        });
    }

    function open(cb) {
        http._context.request(options, function (req) {
            cb(req);
            req.on('response', function (res) {
                res.on('data', function (data) {
                    self.push(data);
                }).on('end', function () {
                    self.push(null);
                })
            });
        }, function (err) {
            self.trigger('error', err);
        });
    }
}

require('util').inherits(Entry, Readable);

Entry.prototype._read = function () {
};

Http.prototype = {
    _conf: {
        clusters: null,
        maxConnects: 30,
        retryTimeout: 400,
        maxRetries: 3
    },
    _context: null,
    request: function (options, data) {
        if (options.method && options.method !== 'GET') {
            if (typeof data === 'string') {
                data = new Buffer(data);
            }
            var headers = options.headers || (options.headers = {});
            headers['Content-Length'] = data ? data.length : 0;
        }

        var deferred = Q.defer();
        this._context.request(options, function (req) {
            req.on('response', function (tres) {
                readBody(tres, function (buffer) {
                    if (tres.statusCode < 300) {
                        deferred.resolve(buffer);
                    } else {
                        deferred.reject({
                            status: tres.statusCode,
                            message: buffer.toString()
                        });
                    }
                })
            }).on('error', deferred.reject);

            req.end(data);
        }, deferred.reject);
        return deferred.promise;
    },
    get: function (url, options) {
        return this._request('GET', url, null, options);
    },
    getJSON: function (url, options) {
        return this.get(url, options).then(function (buffer) {
            return JSON.parse(buffer);
        });
    },
    postJSON: function (url, data, options) {
        return this._request('POST', url, data, options).then(function (buffer) {
            return JSON.parse(buffer);
        });
    },
    put: function (url, data, options) {
        return this._request('PUT', url, data, options)
    },
    'delete': function (url, data, options) {
        return this._request('DELETE', url, data, options)
    },
    _request: function (method, url, data, options) {
        options = options || {};
        options.method = method;
        options.path = url;
        return this.request(options, data);
    },
    open: function (options) {
        return new Entry(options, this);
    }
};