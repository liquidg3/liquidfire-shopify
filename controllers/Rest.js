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
                count   = request.get('count', false),
                meta    = request.get('metafields', false);

            return this._search.findFromEvent('liquidfire:Shopify/entities/Product', e, {
                transform: function (entity) {

                    //are we pulling in meta fields too?
                    return this.all(entity.getHttpResponseValues(e, {
                        metafields: {
                            fetch: meta
                        }
                    }));

                }.bind(this),
                findOptions: {
                    event: e,
                    count: count
                },

            }).then(function (results) {
                return results;
            });
        }


    });

});