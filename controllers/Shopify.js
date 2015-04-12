define(['altair/facades/declare',
        'altair/Lifecycle',
        'altair/events/Emitter',
        'titan/modules/alfred/mixins/_HasCookiesMixin'
], function (declare, Lifecycle, Emitter, _HasCookiesMixin) {

    return declare([Lifecycle, Emitter, _HasCookiesMixin], {

        _shopify: null, //shopify model

        startup: function () {

            this._shopify = this.model('liquidfire:Shopify/models/Shopify');

            return this.inherited(arguments);

        },


        /**
         * /shopify
         *
         * Tries to authenticate you against the
         *
         * @param e
         * @returns {string}
         */
        shopify: function (e) {

            var shopify = this.nexus('liquidfire:Shopify'),
                api     = e.get('shopify'),
                shop    = e.get('shop');

            //have we configured a shop yet?
            if (!shopify.get('shopName')) {
                return 'no shop name provided, not yet supported';
            }


            //do we have a valid API?
            if (!api || !shop || (shop && shop.appVersion != this.nexus('liquidfire:Shopify').get('appVersion', 0))) {

                return this._shopify.redirectToShopifyAuth(e);

            } else {

                e.get('response').redirect(shopify.get('redirectUrl'));

            }


        },

        /**
         * /shopify/auth
         *
         * @param e
         * @returns {Deferred}
         */
        auth: function (e) {

            var shopify     = this._shopify,
                api         = this.nexus('liquidfire:Shopify').api(e),
                response    = e.get('response'),
                done        = function () {

                    //save token
                    shopify.persistToken(e, api.config.access_token);

                    //redirect to final destination
                    var dest = this.nexus('liquidfire:Shopify').get('redirectUrl');
                    response.redirect(dest);

                    e.stopPropagation();

                    //finish this request
                    dfd.resolve();

                }.bind(this),
                fail = function (err) {
                    e.set('theme', false);
                    dfd.resolve(err.message);
                },
                query   = e.get('request').query(),
                cookies = e.get('cookies'),
                dfd     = new this.Deferred();


            this.promise(api, 'exchange_temporary_token', query).then(function (err, token) {

                return shopify.shopSettings(api);

            }).then(function (doc) {

                if (doc && doc.appVersion != this.nexus('liquidfire:Shopify').get('appVersion')) {
                    return shopify.update(api, doc, e).then(done).otherwise(fail);
                } else if (doc) {
                    done();
                } else {
                    return shopify.install(api, e).then(done).otherwise(fail);
                }

            }.bind(this)).otherwise(fail);

            return dfd;

        },

        /**
         * /shopify/preferences
         *
         * @param e
         * @returns {*}
         */
        preferences: function (e) {

            var api     = e.get('shopify'),
                shop    = api.config.shop,
                schema  = api.config.preferences_schema;

            if (!schema) {
                return 'No Preferences';
            }

            return this.widget('liquidfire:Forms/widgets/Form.shopify-preferences', {
                enctype: 'multipart/form-data',
                formSchema: schema,
                formValues: {},
                requestEvent: e
            }).then(function (widget) {

                //we can save this widget for later, or just render it immediately
                return widget.render();

            }).then(function (html) {

                return e.get('view').render({
                    form: html
                });


            });


        }



    });

});