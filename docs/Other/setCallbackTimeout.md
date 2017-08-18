### ``setCallbackTimeout(jsapi, timeout, callback)``
Calls ``callback(null, null)`` after ``timeout`` ms has passed if ``jsapi.callbackTracker !== true``. Sets ``jsapi.callbackTracker = true`` if called.
- `jsapi` `<Object>`
- `timeout` `<Number>`
- `callback` `<Function>`

```js
pvh.setCallbackTimeout(jsapi, 1000, callback);
```