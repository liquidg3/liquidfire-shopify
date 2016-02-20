define(['altair/facades/declare',
    './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint:      '/admin/orders.json',
        _getEndpoint:       '/admin/orders/{{_id}}.json',
        _keyPlural:         'orders',
        _keySingular:       'order',
        _createEndpoint:    '/admin/orders.json',
        _updateEndpoint:    '/admin/orders/{{_id}}.json'


    });

});