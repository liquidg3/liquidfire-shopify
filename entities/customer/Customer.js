define(['altair/facades/declare',
        '../_Base',
        'lodash',
        '../../mixins/_HasMetafieldsMixin'
], function (declare, _Base, _, _HasMetafieldsMixin) {

    return declare([_Base, _HasMetafieldsMixin], {

        _metaFieldPredicate: 'customer',


        getPhone: function () {
            return this.get('default_address', {
                phone: null
            }).phone;
        }

    });

});