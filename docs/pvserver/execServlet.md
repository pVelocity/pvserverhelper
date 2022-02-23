### ``execServlet(jsapi, headers, operation, params)``
Calls the Engine Calculation Process and Admin Servlets for ``operation`` on ``protocol``://``host``:``port``with ``headers`` and ``params``. ``headers must include either ``authorization`` or ``cookie`` to be authenticated.

- `jsapi` `<Object>`
- `headers` `<Object>`
- `operation` `<String>`
- `params` `<Object>` : Optional, default is `{}`

```js
pvh.execServlet(jsapi, {
	authorization: 'Basic ' + new Buffer(username + ':' + password).toString('base64')
}, 'GetUsage', {
    fromdate: '01162017',
    todate: '01162018'
}).then(function(result) {
    console.log(result);
});
```