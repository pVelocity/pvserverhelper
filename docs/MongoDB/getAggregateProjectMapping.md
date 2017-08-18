### ``getAggregateProjectMapping(jsapi, collectionName, filter)``
Returns a mapping of the first object found with ``filter`` in collectionName that can be used in `$project` of an aggregation pipeline.
- `jsapi` `<Object>`
- `collectionName` `<String>`
- `filter` `<Object>` : Optional, default is `{}`

```js
pvh.getAggregateProjectMapping(jsapi, 'Opportunities').then(function(result) {

});
```