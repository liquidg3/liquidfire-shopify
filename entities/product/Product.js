define(['altair/facades/declare',
        '../_Base',
        '../../mixins/_HasMetafieldsMixin'
], function (declare, _Base, _HasMetafieldsMixin) {

    return declare([_Base, _HasMetafieldsMixin], {

        _metaFieldPredicate: 'product'


    });

});