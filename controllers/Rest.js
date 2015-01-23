define(['altair/facades/declare',
    'altair/Lifecycle',
    'altair/events/Emitter',
    'titan/modules/alfred/mixins/_HasCookiesMixin'
], function (declare, Lifecycle, Emitter, _HasCookiesMixin) {

    return declare([Lifecycle, Emitter, _HasCookiesMixin], {

        startup: function () {

            //mixin dependencies
            this.defered = this.all({
                _search:  this.model('liquidfire:Spectre/models/Search', null, { parent: this }) //using `this` as parent makes this.entity() behave relative to our controller
            }).then(function (deps) {

                declare.safeMixin(this, deps);

                return this;

            }.bind(this));

            return this.inherited(arguments);

        },

        /**
         * Get us all products. Optionally their meta fields.
         *
         * @param e
         * @returns {*}
         */
        products: function (e) {

            var request = e.get('request'),
                meta    = request.get('metafields', false);

            return this._search.findFromEvent('liquidfire:Shopify/entities/Product', e, {
                transform: function (entity) {

                    //are we pulling in meta fields too?
                    if (meta) {

                        return this.entity('liquidfire:Shopify/entities/Metafield').then(function (store) {

                            return store.find({ event: e }).where('product', '===', entity).execute();

                        }).then(function (fields) {

                            return this.all({
                                entity: entity.getHttpResponseValues(e),
                                fields: _.map(fields.toArray(), function (field) {
                                    return field.getHttpResponseValues(e);
                                })
                            })

                        }.bind(this)).then(function (data) {

                            //take on metafields
                            var values = data.entity;

                            values.metafields = {};

                            _.each(data.fields, function (field) {

                                if (!values.metafields[field.namespace]) {
                                    values.metafields[field.namespace] = {};
                                }

                                values.metafields[field.namespace][field.key] = field.value && field.value_type === 'integer' ? parseInt(field.value) : field.value;
                            });

                            return values;

                        });

                    } else {

                        return entity.getHttpResponseValues(e);

                    }

                }.bind(this),
                findOptions: {
                    event: e
                }
            }).then(function (results) {
                return results;
            });
        }


    });

});