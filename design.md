RAPID DAL设计
====

使用方式
----

###单独使用

    var db = require('rapid-dal').instance('mysql://root:root@localhost/db')

###作为rapid-core扩展

    rapid.define({
        'config.dal' : {
            'appdb' : 'mysql://root:root@localhost/db'
        }
    });
    
    rapid.resource.watch('appdb', function(appdb) {
        ...
    });


参数
----

  - protocol 协议。假设协议为`mysql`，rapid-dal会尝试加载`'./impl/mysql'`、`'rapid-mysql'`、`'mysql'`, 并将参数传递到返回结果作为函数进行执行
  - username 鉴权的key，不同协议里有不同规定
  - password 鉴权密码
  - host 使用TCP/IP协议的远端服务器地址 
  - port     使用TCP/IP协议的远端服务端口号，不同协议有不同默认值
  - pathname 使用domain socket协议的远端服务绑定路径，与hostname/port冲突
  - resource 资源名称，不同协议中有不同规定
  - clusters 使用集群地址
  - maxRetries   最多重试次数
  - retryTimeout 重试间隔(clusters模式下可能会无视该参数)
  - maxConnects  最多同时连接数
  - keepAliveTimeout     连接断开前空闲时间
  - keepAliveMaxLife     连接最多复用时间
  - cache    使用缓存
  
####使用集群

通过指定`clusters`选项来使用集群。

clusters接受三种数据类型：对象|字符串数组、字符串。

  - 对于含字符串的数组（如：`['192.168.0.1:3306','192.168.1.2:3306']`），我们将每个字符串中抽取
  host/port/username/password/database等信息并转换为对象，按照对象数组处理
  - 对于字符串类型，字符串将被以`|`切割为字符串列表后按字符串数组类型处理

####使用Cache

通过指定`cache`选项来为数据接口指定cache。`cache选项接受

基础类
----

###Storage

存储类，实现基于key-value的存储与查询。用于文件、缓存、会话等场景

  - function get(key:string, options:object): Promise
  - function set(key:string, data:any, options:object): Promise
  - function delete(key:string): Promise

###Db

Db是对有索引的数据库的抽象，可实现基于条件的查询、更改

  - function find(collection:string, rule:any, options:object): Promise
  - function insert(collection:string, values:any, options:object): Promise
    插入记录，成功时返回对象:
    - insertId: 插入的记录的主键
  - function update(collection:string, data:any, options:object): Promise

###Http

  - function request(options:object, data:any): Promise
  - function get(url:string, options:object): Promise
  - function getJSON(url:string, options:object): Promise
  - function postJSON(url:string, data:any, options:object): Promise 
  - function open(options:object): Http.Entry


###Http.Entry implements stream.Duplex


options:

  - noCache:boolean 禁用缓存，默认为false
  - expires:int 设置缓存过期时间 
  
  

实现
----

###Mysql implements Db, Storage

Protocol: `mysql`; 
resource: `dbname`;
options.pk: 指定在get/set接口中主键的名字，默认为`id`

  - function query(sql:string, data:any): Promise
  - function collection(name:String): Mysql.Collection
  - function begin(): Mysql.Transaction
  - function prepare(): function(data:any): Promise

###Mysql.Collection implements Storage

Protocol: `mysql`; 
resource: `dbname.table`
options.pk: 指定在get/set接口中主键的名字，默认为`id`

###Mysql.Transaction implements Db

  - function commit(): Promise
  - function rollback(): Promise

###

###Cookie implements Storage

  - function get(name:string, options:object): Promise
  - function set(id:string, data:string, options:object): Promise
  
set接口的options接受host，path等额外参数

###Session implements Storage

  - function get(name:string, options:object): Promise
  - function set(id:string, data:json_serializable, options:object): Promise

###Cache implements Storage

  - function Cache.wrap(obj, cache): empty
  在obj上添加缓存。
  - 如果`obj.impl.storage`为true，则重写其`get`和`set`方法
  - 如果`obj.impl.db`为true，则重写其`find`方法
  - 如果`obj.impl.http`为true，则重写其`get`方法