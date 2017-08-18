### ``createExpressionMapping(objectOrArray, accumulator, aggregated, exclude_id)``
Returns a mapping for the properties or elements of ``objectOrArray`` that can be used in a aggregation pipeline. If ``accumulator`` is provided, all properties will be set with it. If ``aggregated`` is `true`, all properties will be set to `_id`. If ``exclude_id`` is `true`, `_id` will be excluded.
- `objectOrArray` `<Object>` or `<Array>`
- `accumulator` `<String>`
- `aggregated` `<Boolean>` : Optional, default is `false`
- `exclude_id` `<Boolean>` : Optional, default is `false`

```js
var objectOrArray = ['Name', 'Value'];
pvh.createExpressionMapping(objectOrArray, '$first', true, true);
```