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

            this.deferred = this.all({
                _store: this.entity('liquidfire:Shopify/entities/Metafield')
            }).then(function (deps) {

                declare.safeMixin(this, deps);
                return this;

            }.bind(this));

            this.inherited(arguments);
        },

        /**
         * Add meta field to a product once.
         *
         * @param e
         * @param product
         * @param values
         * @returns {*}
         */
        findOrCreateMetafieldOnProduct: function (e, product, values) {

            var key = values.key,
                namespace = values.namespace,
                api = e.get('shopify');

            this.assert(key, 'You must pass a key in your values');
            this.assert(namespace, 'You must pass a namespace in your values');

            //find all meta fields for this product
            return this.entity('liquidfire:Shopify/entities/Metafield').then(function (store) {

                return store.findOne({
                    event: e
                })
                    .where('product', '===', product.primaryValue ? product.primaryValue() : product)
                    .and()
                    .where('key', '===', key)
                    .and()
                    .where('namespace', '===', namespace)
                    .execute();

            }).then(function (field) {

                if (!field) {
                    field = this._store.create(values);
                }

                field.set('product', product);

                return field;

            }.bind(this));

        },



    });

});