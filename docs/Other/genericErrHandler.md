### ``genericErrHandler(jsapi, callback)``
Returns a function that can be used in a catch. Cleanup is call and the callback is called with an error.
- `jsapi` `<Object>`
- `callback` `<Function>`

```js
jsapi.pv.sendRequest('Query', params).then(function(result) {

}).catch(jsapi.pvserver.PVServerError, pvh.scriptErrHandler(jsapi, callback)).catch(pvh.genericErrHandler(jsapi, callback));
```