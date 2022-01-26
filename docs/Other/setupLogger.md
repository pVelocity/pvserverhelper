### ``setupLogger(jsapi, [timestamp])``
Setups a logger for logging messages.
- `jsapi` `<Object>`
- `timestamp` `<Boolean>` : Optional, default is ``false``

```js
pvh.setupLogger(jsapi);
```

Logger with default winston.
```js
var winston = require('winston')
var jsapi = {};
jsapi.logger = new winston.createLogger({
    level: 'info',
    transports: [
      new winston.transports.File({
        filename: 'log.txt',
        maxsize: '10000000' //10MB
      })
    ]
  });
pvh.setupLogger(jsapi);
```

Logger with winston and multiple files.
```js
var winston = require('winston')
var jsapi = {};
jsapi.logger = new winston.createLogger({
    level: 'info',
    transports: [
      new winston.transports.File({
        filename: 'info.txt',
        maxsize: '10000000' //10MB
      }),
      new winston.transports.File({
        level: 'warn',
        filename: 'warn.txt',
        maxsize: '10000000' //10MB
      })
    ]
  });
pvh.setupLogger(jsapi);
```

Logger with multiple winston instance.
```js
var winston = require('winston')
var jsapi = {};
jsapi.logger = new winston.createLogger({
    level: 'info',
    transports: [
      new winston.transports.File({
        filename: 'log.txt',
        maxsize: '10000000' //10MB
      })
    ]
  });
pvh.setupLogger(jsapi);

var jsapi2 = {};
jsapi2.logger = new winston.createLogger({
    level: 'info',
    transports: [
      new winston.transports.File({
        filename: 'log2.txt',
        maxsize: '10000000' //10MB
      })
    ]
  });
pvh.setupLogger(jsapi2);
```

### ``info(message)``
Logs a message with `INFO`.
- `message` `<String>`

```js
jsapi.logger.info('Hello World');
```

### ``warn(message)``
Logs a message with `WARN`.
- `message` `<String>`

```js
jsapi.logger.warn('Hello World');
```

### ``error(error, throwError)``
Logs a ``error`` with `ERROR`.
- `error` `<Object>` or `<String>`
- `throwError` `<Boolean>` : Optional, default is ``true``

```js
jsapi.logger.error({
	message: 'Opps'
});
```

### ``infoAsync(message)``
Calls `info` with a promise.
- `message` `<String>`

```js
await jsapi.logger.infoAsync('Hello World');
```

### ``warnAsync(message)``
Calls `warn` with a promise.
- `message` `<String>`

```js
await jsapi.logger.warnAsync('Hello World');
```

### ``errorAsync(error, throwError)``
Calls `error` with a promise.
- `error` `<Object>` or `<String>`
- `throwError` `<Boolean>` : Optional, default is ``true``

```js
await jsapi.logger.errorAsync({
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