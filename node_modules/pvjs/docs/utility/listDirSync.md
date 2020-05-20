### ``listDirSync(dir)``
Returns a list of all files for the directory ``dir``, including subdirectories. If it is a file, an one element array containing the file path is returned.

- `dir` `<String>`

```js
var files = PV.listDirSync('D://HelloWorld');
```