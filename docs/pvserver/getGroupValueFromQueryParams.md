### ``getGroupValueFromQueryParams(queryParams, objectName, groupName)``
Return the group value from the parameters of a RPM API Query for ``objectName``'s ``groupName``.
- `queryParams` `<Object>`
- `objectName` `<String>`
- `groupName` `<String>`

```js
var queryParams = {
    Currency: 'EUR',
    ProfitModel: 'pvmodel://MongoDB.pvelocity.com/c40b3954-6224-4818-b6e1-ecfc7243144a',
    Category: 'DataPoints',
    SearchCriteria: {
        DateRange: {
            _attrs: {
                ignoreBaseQuery: 'true'
            },
            From: {
                Year: '2000',
                Month: '1'
            },
            To: {
                Year: '2050',
                Month: '1'
            }
        },
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
    },
    Groups: {
        Group: {
            _attrs: {
                name: 'Res1'
            },
            _text: 'Opportunities_name'
        }
    },
    Fields: {
        Field: ['Opportunities_value']
    }
};
pvh.getGroupValueFromQueryParams(queryParams, 'Opportunities', 'Opportunities_name');
```