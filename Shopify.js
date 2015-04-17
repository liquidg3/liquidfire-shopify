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
                response    = e.get('response'),
                shop        = this.get('shopName'),
                fullShop    = shop,
                _options    = mixin({
                shop:                   shop,
                privateKey:             this.get('privateAppKey'),
                privatePass:            this.get('privateAppPassword'),
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

            if (this._apiCache[shop]) {
                return this._apiCache[shop];
            }

            require(['altair/plugins/node!shopify-node-api', 'altair/plugins/node!cookies', 'altair/plugins/node!https'], function (Shopify, Cookies, https) {

                var cookies = request && response ? new Cookies(request.raw(), response.raw()) : null,
                    token   = cookies && cookies.get('shopify');

                //do we have an access token?
                if (token) {
                    _options.access_token = token;
                }

                if (!Shopify._beenAugmented) {

                    Shopify._beenAugmented = true;

                    Shopify.prototype.makeRequest = function(endpoint, method, data, callback, retry) {

                        var dataString = JSON.stringify(data),
                            options = {
                                hostname: this.hostname(),
                                path: endpoint,
                                method: method.toLowerCase() || 'get',
                                port: this.port(),
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            },
                            self = this;

                        if (this.config.access_token) {
                            options.headers['X-Shopify-Access-Token'] = this.config.access_token;
                        }

                        if (options.method === 'post' || options.method === 'put' || options.method === 'delete') {
                            options.headers['Content-Length'] = new Buffer(dataString).length;
                        }

                        if (this.config.privateKey && this.config.privatePass) {
                            options.auth = this.config.privateKey + ':' + this.config.privatePass;
                            delete options.headers['X-Shopify-Access-Token'];
                        }

                        var request = https.request(options, function(response){
                            self.conditional_console_log( 'STATUS: ' + response.statusCode );
                            self.conditional_console_log( 'HEADERS: ' + JSON.stringify(response.headers) );

                            if (response.headers && response.headers.http_x_shopify_shop_api_call_limit) {
                                self.conditional_console_log( 'API_LIMIT: ' + response.headers.http_x_shopify_shop_api_call_limit);
                            }

                            response.setEncoding('utf8');

                            var body = '';

                            response.on('data', function(chunk){
                                self.conditional_console_log( 'BODY: ' + chunk );
                                body += chunk;
                            });

                            response.on('end', function(){

                                var delay = 0;

                                // If the request is being rate limited by Shopify, try again after a delay
                                if (response.statusCode === 429) {
                                    return setTimeout(function() {
                                        self.makeRequest(endpoint, method, data, callback);
                                    }, self.config.rate_limit_delay || 10000 );
                                }

                                // If the backoff limit is reached, add a delay before executing callback function
                                if (response.statusCode === 200 && self.has_header(response, 'http_x_shopify_shop_api_call_limit')) {
                                    var api_limit = parseInt(response.headers['http_x_shopify_shop_api_call_limit'].split('/')[0], 10);
                                    if (api_limit >= (self.config.backoff || 35)) delay = self.config.backoff_delay || 1000; // in ms
                                }

                                setTimeout(function(){

                                    var   json = {}
                                        , error;

                                    try {
                                        if (body.trim() != '') { //on some requests, Shopify retuns an empty body (several spaces)
                                            json = JSON.parse(body);
                                            if (json.hasOwnProperty('error') || json.hasOwnProperty('errors')) {
                                                error = {
                                                    error : (json.error || json.errors)
                                                    , code  : response.statusCode
                                                };
                                            }
                                        }
                                    } catch(e) {
                                        error = e;
                                    }

                                    callback(error, json, response.headers);
                                }, delay); // Delay the callback if we reached the backoff limit

                            });

                        });

                        request.on('error', function(e){
                            self.conditional_console_log( "Request Error: ", e );
                            if(self.config.retry_errors && !retry){
                                var delay = self.config.error_retry_delay || 10000;
                                self.conditional_console_log( "retrying once in " + delay + " milliseconds" );
                                setTimeout(function() {
                                    self.makeRequest(endpoint, method, data, callback, true);
                                }, delay );
                            } else{
                                callback(e);
                            }
                        });

                        if (options.method === 'post' || options.method === 'put' || options.method === 'delete') {
                            request.write(dataString);
                        }

                        request.end();

                    };
                }

                api = new Shopify(_options);


            }.bind(this));


            if (api.config.access_token || (_options.privateKey && _options.privatePass))  {

                this._apiCache['https://' + shop + '.myshopify.com']   = api;
                this._apiCache[shop + '.myshopify.com']                = api;
                this._apiCache[shop]                                   = api;

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