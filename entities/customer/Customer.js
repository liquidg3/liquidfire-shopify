define(['altair/facades/declare',
    '../_Base',
    'lodash',
    '../../mixins/_HasMetafieldsMixin',
    'altair/facades/__'
], function (declare, _Base, _, _HasMetafieldsMixin, __) {

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


        },

        save: function (options, config) {

            //if they have a default address, lets match the names (is this a good idea?? who knows)
            var addy = this.get('addresses', []);

            if (addy[0]) {

                addy[0].first_name = this.get('first_name');
                addy[0].last_name  = this.get('last_name');
                addy[0].name   = __('%s %s', addy[0].first_name, addy[0].last_name);

            }

            return this.store.save(this, options, config);

        }


    });

});