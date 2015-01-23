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

            if (query) {
                endpoint += endpoint.indexOf('?') === -1 ? '?' : '&';
                endpoint += this.serialize(query);
            }

            return this.promise(api, 'get', endpoint).then(function (data, headers) {

                var items = [];

                _.each(data[0][this._keyPlural] || [], function (item) {

                    items.push(this.create(item));

                }.bind(this));

                return new ArrayCursor(items, statement);

            }.bind(this)).otherwise(function (err) {

                this.err('failed to find() on shopify.')
                this.err(err);

                return new ArrayCursor([], statement);

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

               var values = data[0][this._keySingular],
                   item   = this.create(values);

                return item;

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

            this.assert(this._findEndpoint, 'you must set a _findEndpoint on your store');

            var api     = options.event.get('shopify'),
                clauses = q.clauses(),
                limit   = clauses.limit || 10,
                page    = clauses.skip + 1 || 1;

            return this.get(api, options.statement, this._findEndpoint, mixin({
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
            if (options && options.event && options.event.get('shopify')) {

                var statement = new Statement(this.hitch('_find', options));
                options.statement = statement;

                return statement;

            } else {

                throw new Error('event is required in options for find() to work.');

            }


        },

        /**
         * Find only 1 of any type
         *
         * @param options
         * @returns {*}
         */
        findOne: function (options) {

            var query = this.find(options);
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
                endpoint    = action === 'update' ? this._updateEndpoint : this._createEndpoint,
                api;

            this.assert(endpoint, 'You must set a _createEndpoint && _updateEndpoint');
            this.assert(e, 'You must pass an event to save({event: e}).');

            api = e.get('shopify');

            if (_config.action) {
                action = _config.action;
            }

            this.assert(options && options.event, 'You must pass { event: e } in options.');

            return this.all(entity.getValues({}, { methods: ['toDatabaseValue'] })).then(function (values) {

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
                entity.mixin(values);

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