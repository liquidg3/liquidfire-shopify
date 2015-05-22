define(['altair/facades/declare',
        './_Base',
        'altair/Lifecycle',
        'altair/cartridges/database/Statement',
        'altair/cartridges/database/cursors/Array',
], function (declare, _Base, Lifecycle, Statement, ArrayCursor) {


    return declare([_Base, Lifecycle], {

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
                api     = options.shopify || options.event.get('shopify');

            //if we are searching by product, search changes
            if (clauses.where && clauses.where.product) {

                var id = clauses.where.product.primaryValue ? clauses.where.product.primaryValue() : clauses.where.product;
                delete clauses.where.product;

                return this.get(api, options.statement, '/admin/products/' + id + '/metafields.json', clauses.where);

            } else if(clauses.where && clauses.where.customer) {

                var id = clauses.where.customer.primaryValue ? clauses.where.customer.primaryValue() : clauses.where.customer;
                delete clauses.where.customer;

                clauses.where.metafield = {
                    owner_id: id,
                    owner_resource: 'customer'
                };


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

            }

        }

    });

});