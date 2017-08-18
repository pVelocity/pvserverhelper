### ``login(jsapi, protocol, host, port, username, password)``
Calls the RPM API Login on ``protocol``://``host``:``port``with ``username`` and ``password``.
- `jsapi` `<Object>`
- `protocol` `<String>`
- `host` `<String>`
- `port` `<Number>`
- `username` `<String>`
- `password` `<String>`

```js
pvh.login(jsapi, 'http', 'localhost', 80, 'username', 'password').then(function(success) {
    if (success) {
        console.log('Success');
    } else {
        console.log('Failure');
    }
});
```