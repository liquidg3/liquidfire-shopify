/**
 * Shopify and profit
 *
 * @author:     Taylor Romero
 * @license:    MIT
 * @vendor:     liquidfire
 * @module:     Shopify
 * @nexus:      this.nexus("liquidfire:Shopify")
 *
 */

define(['altair/facades/declare',
        'altair/Lifecycle',
        'altair/mixins/_AssertMixin',
        'apollo/_HasSchemaMixin',
        'altair/events/Emitter',
        'altair/facades/mixin',
        'lodash'
], function (declare,
             Lifecycle,
             _AssertMixin,
             _HasSchemaMixin,
             Emitter,
             mixin,
             _) {

    return declare([Lifecycle, Emitter, _HasSchemaMixin, _AssertMixin], {

        _apiCache: {},
        _shopifyModel: null, //models/Shopify
        startup: function (options) {

            //check to make sure we have a database connection
            var db = this.nexus('cartridges/Database');

            if (!db.connection() || !options) {
                this.warn('Shopify needs at least one database connection configured.');
            } else {

                //so we can do work later
                this._shopifyModel = this.model('liquidfire:Shopify/models/Shopify');

                //drop in routes
                this.on('titan:Alfred::will-execute-app').then(this.hitch('onWillExecuteAlfredApp'));

                //drop in shopify api into events
                this.on('titan:Alfred::did-receive-request').then(this.hitch('onDidReceiveAlfredRequest'));

            }

            return this.inherited(arguments);

        },

        /**
         * Setup our routes in Alfred
         *
         * @param e
         */
        onWillExecuteAlfredApp: function (e) {

            var options = e.get('options');

            if (this.get('apiKey') && !options.routes['/shopify']) {

                var routes = _.clone(options.routes);

                options.routes = {};

                //shopify authenticate
                if (!options.routes['/shopify']) {

                    options.routes['/shopify'] = {
                        action: 'liquidfire:Shopify/controllers/Shopify::shopify',
                        layoutContext: {
                            title:  'Shopify',
                            bodyClass: 'shopify'
                        }
                    };

                }

                //install url
                if (!options.routes['/shopify/auth']) {

                    options.routes['/shopify/auth'] = {
                        action: 'liquidfire:Shopify/controllers/Shopify::auth',
                        layout: false
                    };

                }

                //settings
                if (!options.routes['/shopify/preferences']) {

                    options.routes['/shopify/preferences'] = {
                        action: 'liquidfire:Shopify/controllers/Shopify::preferences',
                        layoutContext: {
                            title: 'Preferences',
                            bodyClass: 'preferences'
                        }
                    };

                }

                //entities
                _.each(['products'], function (name) {

                    if (!options.routes['/v1/rest/shopify/' + name + '.json']) {
                        options.routes['/v1/rest/shopify/' + name + '.json'] = {
                            action: 'liquidfire:Shopify/controllers/Rest::' + name,
                            layout: false
                        };
                    }
                });



                //copy back routes (this ensures the angular routes are first)
                _.each(routes, function (route, key) {
                   options.routes[key] = route;
                });

            } else {
                this.warn('No store configured. See shopify\'s README.md for help getting started.');
            }

        },


        /**
         * Builds you an api object
         *
         * @param options
         */
        api: function (e, options) {

            this.assert(e, 'You must pass an event with a valid request to api().');

            var api,
                request     = e.get('request'),
                response    = e.get('response')
                _options    = mixin({
                shop:                   this.get('shopName'),
                shopify_api_key:        this.get('apiKey'),
                shopify_shared_secret:  this.get('sharedSecret'),
                shopify_scope:          this.get('scope'),
                redirect_uri:           '/shopify/auth',
                verbose:                false,
                preferences_schema:     this.get('preferencesSchema')
            }, options || {});

            //drop in domain and protocol
            var redirect = request.hostWithProtocol() + _options.redirect_uri;
            _options.redirect_uri = redirect;

            require(['altair/plugins/node!shopify-node-api', 'altair/plugins/node!cookies'], function (Shopify, Cookies) {

                var cookies = request && response ? new Cookies(request.raw(), response.raw()) : null,
                    token   = cookies && cookies.get('shopify');

                //do we have an access token?
                if (token) {
                    _options.access_token = token;
                }

                api = new Shopify(_options);

            }.bind(this));


            if (api.config.access_token)  {

                this._apiCache['https://' + _options.shop + '.myshopify.com']   = api;
                this._apiCache[_options.shop + '.myshopify.com']                = api;
                this._apiCache[_options.shop]                                   = api;

            }

            this.emit('did-build-api', {
                api: api,
                options: _options
            });

            return api;

        },

        /**
         * If we have an api available, we'll use it.
         *
         * @param key
         * @returns {Shopify}
         */
        shopApi: function (shop) {
            return this._apiCache[shop];
        },

        /**
         * Setup environment, called because of _HasCookiesMixin
         *
         * @param e
         */
        onDidReceiveAlfredRequest: function (e) {

            var api     = this.api(e),
                apiKey  = '',
                shop    = '',
                theme   = e.get('theme');

            if (api.config.access_token) {

                apiKey = api.config.shopify_api_key;
                shop   = api.config.shop;

                e.set('shopify', api);

            }

            if (theme) {
                theme.set('shopifyApiKey', apiKey);
                theme.set('shopifyShopName', shop);
            }

            //load the shop's settings and drop them into the request
            if (shop) {

                return this._shopifyModel.shopSettings(api).then(function (doc) {
                    e.set('shop', doc);
                });


            }

        }


    });

});