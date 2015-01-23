define(['altair/facades/declare',
    './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint:  '/admin/products.json',
        _keyPlural:   'products',
        _keySingular:     'product',

    });

});