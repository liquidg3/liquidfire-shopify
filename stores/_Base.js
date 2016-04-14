define(['altair/facades/declare',
    'altair/Lifecycle',
    'liquidfire/modules/spectre/db/Store',
    'altair/cartridges/database/Statement',
    'altair/cartridges/database/cursors/Array',
    'altair/mixins/_AssertMixin',
    'lodash',
    'altair/facades/mixin'
], function (declare, Lifecycle, Store, Statement, ArrayCursor, _AssertMixin, _, mixin) {


    return declare([Store, _AssertMixin], {

        _hitRequestLimit:       false,
        _findEndpoint:          null,
        _keyPlural:             null,
        _createEndpoint:        null,
        _updateEndpoint:        null,
        _countEndpoint:         null,
        _getCacheTimeouts:      null,

        _maxLimit:  250, //most amout of records returned at once
        _cacheHolder:           null,

        startup: function () {

            this._cacheHolder                       = this.nexus('liquidfire:Shopify');
            this._cacheHolder._getCache             = {};
            this._cacheHolder._getCacheTimeouts     = {};

            return this;

        },

        /**
         * Serialize an object into a query string
         *
         * @param obj
         * @param prefix
         * @returns {string}
         */
        serialize:  function(obj, prefix) {
            var str = [];
            for(var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
                    str.push(typeof v == "object" ?
                        this.serialize(v, k) :
                    encodeURIComponent(k) + "=" + encodeURIComponent(v));
                }
            }
            return str.join("&");
        },

        create: function (values, options) {

            var entity = this.inherited(arguments);

            this.assert(options, 'you must pass { shopify: api } to create');
            this.assert(options.shopify, 'you must pass { shopify: api } to create');

            entity.shopify = options.shopify;

            return entity;

        },

        /**
         * Helper to GET anything from shopify
         *
         * @param api
         * @param statement
         * @param endpoint
         * @param query
         * @returns {*}
         */
        get: function (api, statement, endpoint, query, options) {

            var _endpoint   = endpoint,
                _options    = options || {},
                limit       = -1,
                raw         = !!_options.raw;

            if (query) {

                if (query._id) {
                    query.id = query._id;
                    delete query._id;
                }

                if (query.limit) {
                    limit           = query.limit;
                    statement.limit = limit;
                    query.limit     = Math.min(query.limit, this._maxLimit);
                }

                _endpoint += _endpoint.indexOf('?') === -1 ? '?' : '&';
                _endpoint += this.serialize(query);
            }

            statement.endpoint = endpoint;
            statement.api      = api;
            statement.query    = query;

            if (this._cacheHolder._getCache[_endpoint]) {
                return this._cacheHolder._getCache[_endpoint];
            }

            if (this._cacheHolder._getCacheTimeouts[_endpoint]) {
                clearTimeout(this._cacheHolder._getCacheTimeouts[_endpoint]);
            }

            this._cacheHolder._getCacheTimeouts[_endpoint] = setTimeout(function () {
                delete this._cacheHolder._getCache[_endpoint];
                this._cacheHolder._getCacheTimeouts[_endpoint] = false;
            }.bind(this), 1000 * 60 * 2); //clear cache in 2 minutes

            var promise = this.promise(api, 'get', _endpoint).then(function (data, headers) {

                if (data && data[1]) {

                    if (this._hitRequestLimit) {

                        this._hitRequestLimit = false;
                        this.warn('receiving requests once again ', data[1].http_x_shopify_shop_api_call_limit);

                    }

                    if (data[1].http_x_shopify_shop_api_call_limit === '40/40') {

                        this._hitRequestLimit = true;
                        this.warn('hit shopify request limit ', data[1].http_x_shopify_shop_api_call_limit);

                    }


                }

                if (raw) {
                    return [
                        data, headers
                    ];
                }

                var items = [],
                    results = data[0][this._keySingular] ? [data[0][this._keySingular]] : data[0][this._keyPlural] || [];

                _.each(results, function (item) {

                    item = this.create(item, {
                        shopify: api
                    });
                    items.push(item);

                }.bind(this));

                return new ArrayCursor(items, statement, undefined, function (cursor) {

                    var statement = cursor.statement(),
                        query     = statement.query,
                        endpoint  = statement.endpoint,
                        api       = statement.api,
                        originalLimit = statement.limit,
                        limit     = query.limit,
                        page      = query.page;

                    if (_.isNumber(page) && _.isNumber(limit) && (limit * page) < originalLimit && cursor.toArray().length === limit) {

                        page = parseInt(page) + 1;
                        query.page = page;
                        query.limit = originalLimit;

                        return this.get(api, statement, endpoint, query);


                    }

                    return false;


                }.bind(this));

            }.bind(this)).otherwise(function (err) {

                //clear cache
                this._cacheHolder._getCache[_endpoint] = false;

                //404 is not a real error
                if (err.code && err.code == 404) {
                    return null;
                } else if (err.message) {
                    this.err('call to ', _endpoint, ' failed');
                    throw err;
                } else if(_.isString(err)) {
                    this.err('call to ', _endpoint, ' failed');
                    throw new Error(err);
                } else if(_.isObject(err)) {
                    this.err('call to ', _endpoint, ' failed');
                    throw new Error(JSON.stringify(err));
                }


                throw err;

            }.bind(this));

            this._cacheHolder._getCache[_endpoint] = promise;


            return promise;

        },

        /**
         * Post to shopify
         *
         * @param api
         * @param statement
         * @param endpoint
         * @param data
         * @param query
         * @param method
         * @returns {*}
         */
        post: function (api, endpoint, data, query, method) {

            if (query) {
                endpoint += endpoint.indexOf('?') === -1 ? '?' : '&';
                endpoint += this.serialize(query);
            }

            //clear out all cache since we've posted something
            this._cacheHolder._getCache = {};

            return this.promise(api, method || 'post', endpoint, data).then(function (data, headers) {

                if (!data[1] || !data[1].status || (data[1].status !== '200 OK' && data[1].status !== '201 Created')) {
                    throw new Error(data[1].status);
                }

                var values = data[0][this._keySingular];

                return values;

            }.bind(this)).otherwise(function (error) {

                if (error.error) {
                    this.err('Shopify ' + (method || 'post') + ' failed', data);
                    throw new Error(error.error[this._keySingular] || error.error[this._keyPlural] || error.error['metafields.key'] || error.error && Object.keys(error.error)[0] + ' ' + error.error[Object.keys(error.error)[0]] || error.error.base[0]);
                }

                //pass through error
                throw error;

            }.bind(this));

        },

        /**
         * Put some data.
         *
         * @param api
         * @param statement
         * @param endpoint
         * @param data
         * @param query
         * @returns {*}
         */
        put: function (api, endpoint, data, query) {
            return this.post(api, endpoint, data, query, 'put');
        },

        /**
         * Find callback.
         *
         * @param options
         * @param q
         * @returns {*}
         * @private
         */
        _find: function (options, q) {

            var _options    = options || {},
                api         = options.shopify || options.event.get('shopify'),
                clauses     = q.clauses(),
                findOne     = _options.findOne,
                limit       = clauses.limit || 20,
                page        = clauses.skip > 0 ? Math.ceil((clauses.skip + 1) / limit) : 1,
                count       = !!_options.count,
                endpoint    = _options.endpoint ? _options.endpoint : findOne ? this._getEndpoint : this._findEndpoint,
                query;

            this.assert(endpoint, 'you must set a _findEndpoint and _getEndpoint on your store.');


            if (findOne && clauses.where._id) {
                endpoint = endpoint.replace('{{id}}', clauses.where._id || clauses.where.id).replace('{{_id}}', clauses.where._id || clauses.where.id);
                delete clauses.where._id;
                delete clauses.where.id;
            }
            //basic search does not need the id in the url
            else if (findOne && !clauses.where._id) {
                endpoint = endpoint.replace('/{{id}}', '');
            }

            query = mixin(findOne ? {} : {
                limit: limit,
                page: page
            }, clauses.where || {});

            return this.all({
                count: count ? this.get(api, options.statement, this._countEndpoint, clauses.where, { raw: true } ) : false,
                cursor: this.get(api, options.statement, endpoint, query, _options)
            }).then(function (response) {

                if (count && response.count) {
                    response.cursor.setTotal(response.count[0][0].count);
                }

                return response.cursor;


            });

        },


        /**
         * Overridden find()
         *
         * @param options
         * @returns {*}
         */
        find: function (options) {

            //an event is required
            if (options && ((options.event && options.event.get('shopify')) || (options.shopify))) {

                var statement = new Statement(this.hitch('_find', options));
                options.statement = statement;

                return statement;

            } else {

                throw new Error('event with shopify or shopify is required in options for find() to work.');

            }


        },

        /**
         * Find only 1 of any type
         *
         * @param options
         * @returns {*}
         */
        findOne: function (options) {

            var _options = options || {};
            _options.findOne = true;

            var query = this.find(_options);
            query.limit(1);

            query.on('did-execute', function (e) {
                var results = e.get('results');
                if (results) {
                    e.set('results', results.toArray()[0]);
                }
            });

            return query;

        },

        /**
         * Save something back to spotify.
         *
         * @param entity
         * @param options
         * @param config
         * @returns {*}
         */
        save: function (entity, options, config) {

            var _options    = options || {},
                _config     = config || {},
                action      = entity.primaryValue() ? 'update' : 'insert',
                e           = _options.event,
                properties  = _options.properties,
                endpoint    = action === 'update' ? this._updateEndpoint : this._createEndpoint,
                api;

            this.assert(endpoint, 'You must set a _createEndpoint && _updateEndpoint');
            this.assert(entity.shopify || e || _options.shopify, 'You must pass an event or shopify to save({event: e}) or save({ shopify: api }).');

            api = _options.shopify ||  entity.shopify || e.get('shopify');;

            if (_config.action) {
                action = _config.action;
            }

            if (entity.primaryValue()) {
                endpoint = endpoint.replace('{{id}}', entity.primaryValue()).replace('{{_id}}', entity.primaryValue());
            }

            return this.all(entity.getValues({}, { methods: ['toShopifyValue', 'toDatabaseValue'] })).then(function (values) {

                //map id
                values.id = values._id;

                //we only need certain props
                if (properties) {
                    values = _.pick(values, properties);
                }

                return this.parent.emit('liquidfire:Spectre::will-save-entity', {
                    store:      this,
                    action:     action,
                    entity:     entity,
                    values:     values,
                    endpoint:   endpoint,
                    options:    options,
                    mapFields:  true
                });

            }.bind(this)).then(function (e) {

                if (!e.active) {
                    return false;
                }

                var values  = e.get('values'),
                    data    = {};

                delete values._id;

                if (e.get('mapFields')) {

                    data[this._keySingular] = {};

                    _.each(values, function (v, k) {

                        if (v !== null) {
                            data[this._keySingular][k] = v;
                        }

                    }, this);

                } else {

                    data = values;

                }


                //does this entity have a primary key?
                if (e.get('action') === 'update') {

                    //if so, update
                    return this.put(api, e.get('endpoint'), data);

                }
                //otherwise lets create
                else {

                    //create record
                    return this.post(api, e.get('endpoint'), data);

                }

            }.bind(this)).then(function (values) {

                //event was cancelled
                if (values === false) {
                    return;
                }

                //the new values should have an Id now
                if (values) {
                    entity.mixin(values);
                }

                this.parent.emit('liquidfire:Spectre::did-save-entity', {
                    store: this,
                    action: action,
                    entity: entity,
                    options: options
                });

                //pass pack the updated entity
                return entity;

            }.bind(this));


        },


    });

});