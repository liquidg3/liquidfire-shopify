define(['altair/facades/declare',
    './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint:  '/admin/customers.json',
        _getEndpoint:  '/admin/customers/{{_id}}.json',
        _keyPlural:     'customers',
        _keySingular:   'customer',
        _createEndpoint: '/admin/customers.json',
        _updateEndpoint: '/admin/customers/{{_id}}.json',

        _find: function (options, q) {

            var clauses = q.clauses(),
                api     = options.shopify || options.event.get('shopify');

            //if we are searching by product, search changes
            if (clauses.where && clauses.where.query) {

                return this.get(api, options.statement, '/admin/customers/search.json', clauses.where);

            } else {

                return this.inherited(arguments);

            }

        }

    });

});