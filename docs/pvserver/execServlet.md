### ``execServlet(jsapi, username, password, operation, params, headers)``
Calls the Engine Calculation Process and Admin Servlets ``operation`` on ``protocol``://``host``:``port``with ``username`` and ``password``.
- `jsapi` `<Object>`
- `username` `<String>`
- `password` `<String>`
- `operation` `<String>`
- `params` `<Object>` : Optional, default is `{}`
- `headers` `<Object>` : Optional, default is `{
	'user-agent': 'pvserverhelper',
    'content-type': 'application/x-www-form-urlencoded',
    'cache-control': 'no-cache',
    'pragma': 'no-cache'
}`

```js
pvh.execServlet(jsapi, 'username', 'password', 'GetUsage', {
    fromdate: '01162017',
    todate: '01162018'
}).then(function(result) {
    console.log(result);
});
```