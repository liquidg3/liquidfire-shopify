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
                api     = e.get('shopify');

            //have we configured a shop yet?
            if (!shopify.get('shopName')) {
                return 'no shop name provided, not yet supported';
            }


            //do we have a valid API?
            if (!api) {

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
                query = e.get('request').query(),
                cookies = e.get('cookies'),
                dfd = new this.Deferred();


            this.promise(api, 'exchange_temporary_token', query).then(function (err, token) {

                return shopify.shopSettings(api);

            }).then(function (doc) {

                if (doc) {
                    done();
                } else {
                    return shopify.install(api).then(done).otherwise(fail);
                }

            }).otherwise(fail);

            return dfd;

        }



    });

});