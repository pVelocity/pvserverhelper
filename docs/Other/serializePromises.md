### ``serializePromises(jsapi, workArray, workFunction)``
Executes promises in synchronous rather than asynchronous. If ``workFunction`` is an array, each element of ``workFunction`` will be executed with the same index for ``workArray``. If ``workFunction`` is a function, it will be executed with each element of ``workArray``.
- `jsapi` `<Object>`
- `workArray` `<Array>`
- `workFunction` `<Array> or <Function>`

```js
var workArray = ['echo hello', 'echo bye'];
var workFunction = [pvh.exec, pvh.exec];
pvh.serializePromises(jsapi, workArray, workFunction);
```