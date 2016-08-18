define(['altair/facades/declare',
    'altair/mixins/_DeferredMixin',
    'altair/events/Emitter',
    'altair/mixins/_AssertMixin'
], function (declare,
             _DeferredMixin,
             Emitter,
             _AssertMixin) {

    return declare([_DeferredMixin, _AssertMixin, Emitter], {

        _store: null, //metafield store
        startup: function () {

            this._store = this.entitySync('liquidfire:Shopify/entities/Metafield');
            return this;
        },

        upsertOnProduct: function (api, product, values) {

            return this.upsertOnEntity('product', api, product, values);

        },

        upsertCustomer: function (api, customer, values) {

            return this.upsertOnEntity('customer', api, customer, values);

        },

        upsertOnProductVariant: function (api, variant, values) {

            return this.upsertOnEntity('variant', api, variant, values);

        },

        upsertOnOrder: function (api, order, values) {

            return this.upsertOnEntity('order', api, order, values);

        },

        /**
         * Add meta field to a product once.
         *
         * @param e
         * @param entity
         * @param values
         * @returns {*}
         */
        upsertOnEntity: function (type, api, entity, values) {

            var key = values.key,
                namespace = values.namespace,
                value_type = values.value_type;

            this.assert(key, 'You must pass a key in your values');
            this.assert(namespace, 'You must pass a namespace in your values');
            this.assert(value_type, 'You must pass a value_type (string, integer) in your values');

            //find all meta fields for this product
            return this.entity('liquidfire:Shopify/entities/Metafield').then(function (store) {

                return store.findOne({
                    shopify: api
                })
                    .where(type, '===', entity.primaryValue ? entity.primaryValue() : entity)
                    .and()
                    .where('key', '===', key)
                    .and()
                    .where('namespace', '===', namespace)
                    .execute();

            }).then(function (field) {

                var created;

                if (!field) {
                    created = true;
                    field = this._store.create(values, {
                        shopify: api
                    });
                } else {
                    field.mixin(values);
                }

                if (field.has(type)) {
                    field.set(type, entity);
                }

                return field.save();

            }.bind(this));

        }

    });

});