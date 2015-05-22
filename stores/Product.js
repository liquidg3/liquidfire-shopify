define(['altair/facades/declare',
        'altair/Lifecycle',
        './_Base'
], function (declare, Lifecycle, _Base) {


    return declare([_Base, Lifecycle], {

        _findEndpoint:      '/admin/products.json',
        _countEndpoint:     '/admin/products/count.json',
        _updateEndpoint:    '/admin/products/{{id}}.json',
        _getEndpoint:       '/admin/products/{{id}}.json',
        _keyPlural:         'products',
        _keySingular:       'product'


    });

});