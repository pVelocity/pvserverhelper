### ``checkCallbackTimeout(jsapi, callback)``
Calls ``callback(null, null)`` if ``jsapi.callbackTracker !== true``.
Sets ``jsapi.callbackTracker = true`` if called.
- `jsapi` `<Object>`
- `callback` `<Function>`

```js
pvh.checkCallbackTimeout(jsapi, callback);
```