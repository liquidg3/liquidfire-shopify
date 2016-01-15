define(['altair/facades/declare',
        './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint:      '/admin/products.json',
        _createEndpoint:    '/admin/products.json',
        _countEndpoint:     '/admin/products/count.json',
        _updateEndpoint:    '/admin/products/{{id}}.json',
        _getEndpoint:       '/admin/products/{{id}}.json',
        _keyPlural:         'products',
        _keySingular:       'product'


    });

});