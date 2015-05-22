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
        install: function (api, e) {

            return this.parent.emit('will-install', {
                api:            api,
                shopify:        api,
                shop:           api.config.shop,
                requestEvent:   e
            }).then(function () {

                return this.parent.emit('install', {
                    api:            api,
                    shopify:        api,
                    shop:           api.config.shop,
                    requestEvent:   e
                });

            }.bind(this)).then(function () {

                return this.parent.emit('did-install', {
                    api:            api,
                    shopify:        api,
                    shop:           api.config.shop,
                    requestEvent:   e
                });

            }.bind(this)).then(function () {

                //save record of install
                return this.nexus('cartridges/Database').create('shopify_installs').set({
                    shop:               api.config.shop,
                    api:                api,
                    shopify:            api,
                    appVersion:         this.parent.get('appVersion'),
                    preferencesSchema:  this.parent.get('preferencesSchema')
                }).execute();


            }.bind(this));


        },

        /**
         * Update a shop.
         * @param api the shopify api
         * @param old the old shop settings
         *
         * @returns {*}
         */
        update: function (api, old, e) {

            return this.parent.emit('will-update', {
                api:            api,
                shop:           api.config.shop,
                old:            old,
                requestEvent:   e
            }).then(function () {

                return this.parent.emit('update', {
                    api:            api,
                    shop:           api.config.shop,
                    old :           old,
                    requestEvent:   e
                });

            }.bind(this)).then(function () {

                return this.parent.emit('did-update', {
                    api:            api,
                    shopify:        api,
                    shop:           api.config.shop,
                    old:            old,
                    requestEvent:   e
                })

            }.bind(this)).then(function () {

                //save record of install
                return this.nexus('cartridges/Database').update('shopify_installs').set({
                    appVersion:         this.parent.get('appVersion'),
                    preferencesSchema:  this.parent.get('preferencesSchema')
                }).where('shop', '===', api.config.shop).execute();


            }.bind(this));


        },

        /**
         * Load all the settings/preferences from your shop
         *
         * @param api
         * @returns {*}
         */
        shopSettings: function (api) {

            return this.nexus('cartridges/Database')
                .findOne('shopify_installs')
                .where('shop', '===', api.config.shop)
                .execute().then(function (results) {


                    return results;

                });
        },

        saveSettings: function (api, settings) {

            return this.nexus('cartridges/Database')
                .update('shopify_installs')
                .set(settings)
                .where('shop', '===', api.config.shop)
                .execute()
                .then(function () {

                    return this.shopSettings(api);

                }.bind(this)).then(function (doc) {

                    this.parent.emit('did-save-settings', {
                        settings: doc,
                        shopify:  api
                    });

                    return doc;

                }.bind(this));;


        },

        isInstalled: function (api) {

            //have we been installed yet?
            return this.shopSettings(api)
                .then(function (doc) {

                    return !!doc;


                });

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