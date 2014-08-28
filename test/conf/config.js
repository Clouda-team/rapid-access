rapid.config.define('dal', {
    appdb: 'mysql://root:root@localhost/test',
    httpServer: 'http://root:root@127.0.0.5:8032/',
    cache: 'cache:///cache',
    cachedDb: 'mysql://root:root@localhost/test?cache=' +
        encodeURIComponent('memcache://3c0cd9292dbf11e4:Good_Job@127.0.0.1/')
});