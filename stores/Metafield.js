define(['altair/facades/declare',
        './_Base',
        'altair/cartridges/database/Statement',
        'altair/cartridges/database/cursors/Array',
], function (declare, _Base, Statement, ArrayCursor) {


    return declare([_Base], {

        _findEndpoint:  '/admin/metafields.json',
        _createEndpoint: '/admin/metafields.json',
        _updateEndpoint: '/admin/metafields/{{id}}.json',
        _keyPlural:     'metafields',
        _keySingular:   'metafield',

        startup: function () {

            this.parent.on('liquidfire:Spectre::will-save-entity', {
                store: this
            }).then(this.hitch('onWillSave'));

            return this.inherited(arguments);
        },

        /**
         * Special find by product
         *
         * @param options
         * @param q
         * @returns {*}
         * @private
         */
        _find: function (options, q) {

            var clauses = q.clauses(),
                api     = options.shopify || options.event.get('shopify'),
                go      = function (key) {

                    var id = clauses.where[key].primaryValue ? clauses.where[key].primaryValue() : clauses.where[key];
                    delete clauses.where[key];

                    return this.get(api, options.statement, '/admin/' + key + 's/' + id + '/metafields.json', clauses.where);

                }.bind(this);


            //if we are searching by product, search changes
            if (clauses.where && clauses.where.product) {

                return go('product');


            } else if(clauses.where && clauses.where.customer) {

                var id = clauses.where.customer.primaryValue ? clauses.where.customer.primaryValue() : clauses.where.customer;
                delete clauses.where.customer;

                clauses.where.metafield = {
                    owner_id: id,
                    owner_resource: 'customer'
                };


            } else if (clauses.where && clauses.where.order) {

                return go('order');

            } else if (clauses.where && clauses.where.variant) {

                return go('variant');

            } else {
                throw new Error('No metafield logic for this use case.');
            }

            return this.inherited(arguments);

        },

        /**
         * Endpoints get weird with metafields
         *
         * @param e
         */
        onWillSave: function (e) {

            var values = e.get('values'),
                id     = values._id,
                endpoint;

            //if there a product, there is a better way to do the update
            if (values.product) {

                var product = values.product.primaryValue ? values.product.primaryValue() : values.product;

                if (id) {
                    endpoint = '/admin/products/' + product + '/metafields/' + id + '.json';
                } else {
                    endpoint = '/admin/products/' + product + '/metafields.json'
                }

                e.set('endpoint', endpoint);

            } else if (values.customer) {

                values.owner_resource = 'customer';
                values.owner_id       = values.customer;

                delete values.customer;
                e.set('values', values);

            } else if (values.variant) {

                values.owner_resource = 'variant';
                values.owner_id       = values.variant;

                delete values.variant;
                e.set('values', values);

            } else if (values.order) {

                values.owner_resource = 'order';
                values.owner_id       = values.order;

                delete values.order;
                e.set('values', values);

            }

        }

    });

});