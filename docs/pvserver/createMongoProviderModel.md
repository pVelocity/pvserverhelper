### ``createMongoProviderModel(jsapi, username, appName, dbHostName, [options])``
'Creates provider model with ``username`` for ``appName`` accessing ``dbHostName``.
- `jsapi` `<Object>`
- `username` `<String>`
- `appName` `<String>`
- `dbHostName` `<String>`
- `options` `<Object>`

```js
pvh.createMongoProviderModel(jsapi, 'admin@test.com', 'CRM', 'mongoDB_local', {
    socketTimeoutMS: 600000
});
```