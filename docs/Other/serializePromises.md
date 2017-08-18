### ``serializePromises(jsapi, workArray, workFunction)``
Executes promises in synchronous rather than asynchronous. Each element of ``workFunction`` will be executed with the same index for ``workArray``.
- `jsapi` `<Object>`
- `workArray` `<Array>`
- `workFunction` `<Array>`

```js
var workArray = ['echo hello', 'echo bye'];
var workFunction = [pvh.exec, pvh.exec];
pvh.serializePromises(jsapi, workArray, workFunction);
```