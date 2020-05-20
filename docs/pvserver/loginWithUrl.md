### ``loginWithUrl(jsapi, url, username, [password], [credKey], [sessionContext])``
Calls the RPM API Login on ``url`` with ``username`` and ``password`` and ``credKey`` with ``sessionContext``.
- `jsapi` `<Object>`
- `url` `<String>`
- `username` `<String>`
- `password` `<String>`
- `credKey` `<String>`
- `sessionContext` `<Object>`

```js
pvh.login(jsapi, 'http', 'localhost', 80, 'username', 'password', 'credKey', {
	AppName: 'Hello World'
}).then(function(success) {
    if (success) {
        console.log('Success');
    } else {
        console.log('Failure');
    }
});
```