### ``login(jsapi, protocol, host, port, username, password)``
Calls the RPM API Login on ``protocol``://``host``:``port``with ``username`` and ``password`` with ``sessionContext``.
- `jsapi` `<Object>`
- `protocol` `<String>`
- `host` `<String>`
- `port` `<Number>`
- `username` `<String>`
- `password` `<String>`
- `sessionContext` `<Object>`

```js
pvh.login(jsapi, 'http', 'localhost', 80, 'username', 'password', {
	AppName: 'Hello World'
}).then(function(success) {
    if (success) {
        console.log('Success');
    } else {
        console.log('Failure');
    }
});
```