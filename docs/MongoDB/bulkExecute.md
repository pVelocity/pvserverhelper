### ``bulkExecute(jsapi, bulk)``
Returns a promise that executes the bulk.
- `jsapi` `<Object>`
- `bulk` `<Bulk>`

```js
var bulk = mongoConn.collection('Test').initializeOrderedBulkOp();
bulk.find({name: 'hello'}).remove();
pvh.bulkExecute(jsapi, bulk).then(function(result) {

});
```