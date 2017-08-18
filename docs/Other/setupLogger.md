### ``setupLogger(jsapi, [enableConsoleInfo])``
Setups a logger for logging messages.
- `jsapi` `<Object>`
- `enableConsoleInfo` `<Boolean>` : Optional, default is ``false``

```js
pvh.setupLogger(jsapi);
```

Logger with winston.
```js
var jsapi = {
	logger: require('winston')
};
jsapi.logger.add(jsapi.logger.transports.File, {
    level: 'info',
    filename: __dirname,
    maxsize: '10000000', //10MB,
    json: false,
    timestamp: function() {
        return new Date();
    }
});
pvh.setupLogger(jsapi);
```

### ``info(message, noTimeStamp)``
Logs a message with `INFO`.
- `message` `<String>`
- `noTimeStamp` `<Boolean>` : Optional, default is ``false``

```js
jsapi.logger.info('Hello World');
```

### ``error(error, throwError)``
Logs a ``error`` with `ERROR`.
- `error` `<Object>`
- `throwError` `<Boolean>` : Optional, default is ``true``

```js
jsapi.logger.error({
	message: 'Opps'
});
```

### ``startTime(message)``
Returns an object to track a message and when it started.
- `message` `<String>`

```js
var helloTime = jsapi.logger.startTime('Hello');
```

### ``endTime(timerObj)``
Logs the message in ``timerObj`` with `TIMER`.
- `timerObj` `<Object>`

```js
var helloTime = jsapi.logger.startTime('Hello');
jsapi.logger.endTime(helloTime);
```