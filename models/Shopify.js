define([
    'altair/facades/declare',
    'altair/mixins/_DeferredMixin',
    'altair/events/Emitter',
    'altair/mixins/_AssertMixin'
], function (declare,
             _DeferredMixin,
             Emitter,
             _AssertMixin) {

    return declare([_DeferredMixin, _AssertMixin, Emitter], {

        _entitiesByShop: {}, //caching
        _settingsByShop: {},

        /**
         * Installs an app.
         *
         * @param api
         * @returns {*}
         */
        install: function (api, e) {

            return this.parent.emit('will-install', {
                api: api,
                shopify: api,
                shop: api.config.shop,
                requestEvent: e
            }).then(function () {

                return this.parent.emit('install', {
                    api: api,
                    shopify: api,
                    shop: api.config.shop,
                    requestEvent: e
                });

            }.bind(this)).then(function () {

                return this.parent.emit('did-install', {
                    api: api,
                    shopify: api,
                    shop: api.config.shop,
                    requestEvent: e
                });

            }.bind(this)).then(function () {

                this.clearCache(api);

                //save record of install
                return this.nexus('cartridges/Database').create('shopify_installs').set({
                    shop: api.config.shop,
                    appVersion: this.parent.get('appVersion'),
                    preferencesSchema: this.parent.get('preferencesSchema')
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
                api: api,
                shop: api.config.shop,
                old: old,
                requestEvent: e
            }).then(function () {

                return this.parent.emit('update', {
                    api: api,
                    shop: api.config.shop,
                    old: old,
                    requestEvent: e
                });

            }.bind(this)).then(function () {

                return this.parent.emit('did-update', {
                    api: api,
                    shopify: api,
                    shop: api.config.shop,
                    old: old,
                    requestEvent: e
                })

            }.bind(this)).then(function () {

                this.clearCache(api);

                //save record of install
                return this.nexus('cartridges/Database').update('shopify_installs').set({
                    appVersion: this.parent.get('appVersion'),
                    preferencesSchema: this.parent.get('preferencesSchema')
                }).where('shop', '===', api.config.shop).execute();


            }.bind(this));


        },

        clearCache: function (api) {

            delete this._settingsByShop[api.config.shop];
            delete this._entitiesByShop[api.config.shop];

        },

        /**
         * Load all the settings/preferences from your shop. Normalized and cleaned through Apollo
         *
         * @param api
         * @returns {*}
         */
        shopSettings: function (api) {

            if (!this._settingsByShop[api.config.shop]) {

                this._settingsByShop[api.config.shop] = this.nexus('cartridges/Database')
                    .findOne('shopify_installs')
                    .where('shop', '===', api.config.shop)
                    .execute().then(function (results) {

                        if (!results) {
                            throw new Error('shop is not installed!');
                        }

                        var entity = this._settingsEntity(api, results);
                        entity.mixin(results.values);

                        return this.all({
                            settings: results,
                            entity: entity,
                            values: this.all(entity.getValues({}, {findOptions: {shopify: api}}))
                        });


                    }.bind(this)).then(function (results) {

                        var settings = results.settings;

                        settings.entity = results.entity;
                        settings.values = results.values;

                        return settings;

                    });

            }

            return this._settingsByShop[api.config.shop];
        },

        _settingsEntity: function (api, settings) {

            if (!this._settingsEntity[api.config.shop]) {

                var apollo = this.nexus('cartridges/Apollo'),
                    schema = apollo.createSchema(settings && settings.preferencesSchema || this.parent.options.preferencesSchema),
                    entity = this.parent.forgeSync('support/Settings', null, {type: 'entity'});

                entity.setSchema(schema);

                this._settingsEntity[api.config.shop] = entity;

            }

            return this._settingsEntity[api.config.shop];


        },

        saveSettings: function (api, changes, options) {

            var _options = options || {},
                entity = this._settingsEntity(api);

            return this.shopSettings(api).then(function (settings) {

                settings.entity.mixin(changes);

                return settings.entity.validate();

            }).then(function (entity) {

                var values = entity.getValues(options, {methods: ['toDatabaseValue']});

                return this.nexus('cartridges/Database')
                    .update('shopify_installs')
                    .set('values', values)
                    .where('shop', '===', api.config.shop)
                    .execute();


            }.bind(this)).then(function (doc) {

                this.clearCache(api);

                if (_options.emit !== false) {

                    this.parent.emit('did-save-settings', {
                        shopify: api
                    });
                }

                this.clearCache(api);

                return this.shopSettings(api);

            }.bind(this));


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
            var token = cookies && cookies.get('shopify');

            return token;
        },

        redirectToShopifyAuth: function (e) {

            var api = this.parent.api(e),
                url = api.buildAuthURL(),
                response = e.get('response');

            //stop the request from finishing and the layout from rendering
            e.stopPropagation();
            e.set('theme', false);

            return "<script type='text/javascript'>" +
                "(window.top || window).location.href = '" + url + "'; " +
                "</script>";

        }

    });

});