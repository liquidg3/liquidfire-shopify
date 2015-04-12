define(['altair/facades/declare',
        'liquidfire/modules/spectre/db/Store',
        'altair/cartridges/database/Statement',
        'altair/cartridges/database/cursors/Array',
        'altair/mixins/_AssertMixin',
        'lodash',
        'altair/facades/mixin'
], function (declare, Store, Statement, ArrayCursor, _AssertMixin, _, mixin) {


    return declare([Store, _AssertMixin], {


        _findEndpoint:  null,
        _keyPlural:     null,
        _createEndpoint: null,
        _updateEndpoint: null,

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
        get: function (api, statement, endpoint, query) {

            var _endpoint = endpoint;

            if (query) {

                if (query._id) {
                    query.id = query._id;
                    delete query._id;
                }

                _endpoint += _endpoint.indexOf('?') === -1 ? '?' : '&';
                _endpoint += this.serialize(query);
            }

            statement.endpoint = endpoint;
            statement.api      = api;
            statement.query    = query;

            return this.promise(api, 'get', _endpoint).then(function (data, headers) {

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
                        query     = cursor.query,
                        endpoint  = cursor.endpoint,
                        api       = cursor.api,
                        limit     = query.limit,
                        page      = query.page;

                    if (_.isNumeric(page) && _.isNumeric(limit) && cursor.toArray().length === limit) {

                        page = parseInt(page) + 1;
                        query.page = page;

                        return this.get(api, statement, endpoint, query);


                    }

                    return false;


                }.bind(this));

            }.bind(this));

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

            return this.promise(api, method || 'post', endpoint, data).then(function (data, headers) {

                if (!data[1] || !data[1].status || (data[1].status !== '200 OK' && data[1].status !== '201 Created')) {
                    throw new Error(data[1].status);
                }

                var values = data[0][this._keySingular];

                return values;

            }.bind(this)).otherwise(function (error) {

                if (error.error) {
                    throw new Error(error.error[this._keySingular] || error.error[this._keyPlural] || error.error.base[0]);
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

            var _options = options || {},
                endpoint = _options.findOne ? this._getEndpoint : this._findEndpoint;

            this.assert(endpoint, 'you must set a _findEndpoint and _getEndpoint on your store.');

            var api     = options.shopify || options.event.get('shopify'),
                clauses = q.clauses(),
                limit   = clauses.limit || 20,
                page    = clauses.skip + 1 || 1;


            if (_options.findOne && (clauses.where._id || clauses.where.id)) {
                endpoint = endpoint.replace('{{id}}', clauses.where._id || clauses.where.id).replace('{{_id}}', clauses.where._id || clauses.where.id);
                delete clauses.where._id;
                delete clauses.where.id;
            }

            return this.get(api, options.statement, endpoint, mixin(_options.findOne ? {} : {
                limit: limit,
                page: page
            }, clauses.where || {}));

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
                e.set('results', results.toArray()[0]);
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