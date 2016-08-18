define(['altair/facades/declare',
        '../_Base',
        '../../mixins/_HasMetafieldsMixin'
], function (declare, _Base, _HasMetafieldsMixin) {

    return declare([_Base, _HasMetafieldsMixin], {

        _metaFieldPredicate: 'order',

        getCustomer: function (options, config) {

            if (this.values.customer) {

                //if set to an entity, keep in an entity
                if (this.values.customer.get) {
                    return this.when(this.values.customer);
                }

                return this.nexus('liquidfire:Shopify/entities/Customer').then(function (store) {

                    return store.findOne({shopify: this.shopify }).where('_id', '===', this.values.customer.id).execute();

                }.bind(this));


            }

            return this.when(null);

        },

        setCustomer: function (customer) {

            if (this.customer && this.customer.get) {
                //if this customer is an entity, convert changes to an object and set
                throw new Error('Not finished');

            }

            return this._set('customer', customer);

        },


    });

});