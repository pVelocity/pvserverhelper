### ``convertStream(readStream, writeStream, successCallback, failureCallback, options, decoding, encoding)``
Converts the contents from the csv ``readStream`` to json ``writeStream`` with ``options``, ``decoding`` and ``encoding`` settings.
- `readStream` `<Buffer>`
- `writeStream` `<Buffer>`
- `successCallback` `<function>`
- `failureCallback` `<function>`
- `options` `<Object>`
- `decoding` `<String>`
- `encoding` `<String>`

```js
var fs = require('fs');
var rd = fs.createReadStream('./hello.csv');
var wr = fs.createWriteStream('./hello.json');

pvh.convertStream(rd, wr, function(result){
	console.log('Success');
}, function(result){
	console.log('Failure');
}, {
    checkType: false,
    ignoreEmpty: true,
    headers: ['Name', 'Value'],
}, 'win1252', 'utf8');
```