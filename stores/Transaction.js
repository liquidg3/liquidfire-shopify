define(['altair/facades/declare',
    './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint:      '/admin/orders/{{orderId}}/transactions.json',
        _getEndpoint:       '/admin/orders/{{orderId}}/{{id}}.json',
        _keyPlural:         'transactions',
        _keySingular:       'transaction',
        _createEndpoint:    '/admin/orders/{{orderId}}/transactions.json',
        _updateEndpoint:    '/admin/orders/{{orderId}}/{{id}}.json',


        _find: function (options, q) {

            var clauses     = q.clauses(),
                _options    = options || {},
                findOne     = _options.findOne,
                endpoint    = _options.endpoint || findOne ? this._getEndpoint : this._findEndpoint,
                api         = options.shopify || options.event.get('shopify');

            if (!clauses.where || !clauses.where.order) {
                throw new Error('You must do where("order", "===", orderOrId) to search transactions');
            }

            var id = clauses.where.order.primaryValue ? clauses.where.order.primaryValue() : clauses.where.order;
            delete clauses.where.order;


            endpoint = endpoint.replace('{{orderId}}', id);
            _options.endpoint = endpoint;
            options = _options;


            return this.inherited(arguments);


        }


    });

});