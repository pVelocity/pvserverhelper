### ``removeFilterFromQueryParams(queryParams, objectName, groupName)``
Remove all filters from the parameters of a RPM API Query for ``objectName``'s ``groupName``.
- `queryParams` `<Object>`
- `objectName` `<String>`
- `groupName` `<String>`

```js
var queryParams = {
    AndFilter: {
        OrFilter: [{
            _attrs: {
                category: 'Opportunities'
            },
            AndFilter: [{
                    Filter: "Opportunities_name='Test'"
                }
            ]
        }]
    }
};
pvh.removeFilterFromQueryParams(queryParams, 'Opportunities', 'Opportunities_name');
```