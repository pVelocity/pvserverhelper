### ``replaceGroupFromQueryParams(queryParams, objectName, mapping)``
Replace existing groups denoted in the ``mapping`` for ``objectName`` in the filters to the parameters of a RPM API Query.
- `queryParams` `<Object>`
- `objectName` `<String>`
- `mapping` `<Object>`

```js
var queryParams = {
    AndFilter: {
        OrFilter: [{
            _attrs: {
                category: 'Accounts'
            },
            AndFilter: [{
                Filter: [
                  "Account_firstName='John'"
                ]
              }, {
                Filter: [
                  "Account_lastName='Smith'"
                ]
            }]
        }]
    }
};

pvh.replaceGroupFromQueryParams(queryParams, 'Owner', {
    'Account_firstName': 'Owner_firstName',
    'Account_lastName': 'Owner_lastName'
});

var queryParams = {
    AndFilter: {
        OrFilter: [{
            _attrs: {
                category: 'Owner'
            },
            AndFilter: [{
                Filter: [
                  "Owner_firstName='John'"
                ]
              }, {
                Filter: [
                  "Owner_lastName='Smith'"
                ]
            }]
        }]
    }
};
```