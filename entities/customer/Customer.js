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
        },

        setPhone: function (value) {

            var addresses = this.get('addresses');

            if (!addresses) {
                addresses = [{
                }];
            }

            addresses[0].phone = value;
            this.set('addresses', addresses);

            return this;


        }

    });

});