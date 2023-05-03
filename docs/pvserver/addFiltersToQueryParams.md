### ``addFiltersToQueryParams(queryParams, objectName, filters)``
Add filters to the parameters of a RPM API Query for ``objectName``'s ``filters``.
- `queryParams` `<Object>`
- `objectName` `<String>`
- `filters` `<Array>`

```js
var queryParams = {};
pvh.addFiltersToQueryParams(queryParams, 'Opportunities', ["Opportunities_name='Test'", "Opportunities_name='Test1'"]);

var queryParams = {
    AndFilter: {
        OrFilter: [{
            _attrs: {
                category: 'Opportunities'
            },
            AndFilter: [{
                Filter: [
                  "Opportunities_name='Test'"
                ]
              }, {
                Filter: [
                  "Opportunities_name='Test1'"
                ]
            }]
        }]
    }
};
```