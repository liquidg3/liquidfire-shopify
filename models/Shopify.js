define(['altair/facades/declare',
    'altair/mixins/_DeferredMixin',
    'altair/events/Emitter',
    'altair/mixins/_AssertMixin'
], function (declare,
             _DeferredMixin,
             Emitter,
             _AssertMixin) {

    return declare([_DeferredMixin, _AssertMixin, Emitter], {


        /**
         * Installs an app.
         *
         * @param api
         * @returns {*}
         */
        install: function (api) {

            return this.parent.emit('will-install', {
                api: api,
                shop: api.config.shop
            }).then(function () {

                return this.parent.emit('install', {
                    api: api,
                    shop: api.config.shop
                });

            }.bind(this)).then(function () {

                return this.parent.emit('did-install', {
                    api: api,
                    shop: api.config.shop
                })

            }.bind(this)).then(function () {


                //save record of install
                return this.nexus('cartridges/Database').create('shopify_installs').set({
                    shop: api.config.shop,
                    version: this.parent.get('appVersion')
                }).execute();


            }.bind(this));


        },

        shopSettings: function (api) {

            return this.nexus('cartridges/Database')
                       .findOne('shopify_installs')
                       .where('shop', '===', api.config.shop)
                       .execute();
        },

        saveSettings: function (api, settings) {

            return this.nexus('cartridges/Database')
                       .update('shopify_installs')
                       .set(settings)
                       .where('shop', '===', api.config.shop)
                       .execute()
                       .then(function () {

                    return this.shopSettings(api);

                }.bind(this));


        },

        isInstalled: function (api) {

            //have we been installed yet?
            return this.shopSettings(api.config.shop)
                       .then(function (doc) {

                           return !!doc;


                       })
                       .otherwise(fail);

        },

        persistToken: function (e, token) {

            var cookies = e.get('cookies');

            cookies.set('shopify', token);


        },

        fetchToken: function (e) {

            var cookies = e.get('cookies')
            var token =  cookies && cookies.get('shopify');

            return token;
        },

        redirectToShopifyAuth: function (e) {

            var api         = this.parent.api(e),
                url         = api.buildAuthURL(),
                response    = e.get('response');

            //stop the request from finishing and the layout from rendering
            e.stopPropagation();
            e.set('theme', false);

            return "<script type='text/javascript'>" +
                "(window.top || window).location.href = '" + url + "'; " +
                "</script>";


        }

    });

});