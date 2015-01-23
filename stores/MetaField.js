define(['altair/facades/declare',
        './_Base',
        'altair/Lifecycle',
        'altair/cartridges/database/Statement',
        'altair/cartridges/database/cursors/Array',
], function (declare, _Base, Lifecycle, Statement, ArrayCursor) {


    return declare([_Base, Lifecycle], {

        _findEndpoint:  '/admin/metafields.json',
        _createEndpoint: '/admin/metafields.json',
        _updateEndpoint: '/admin/metafields.json',
        _keyPlural:     'metafields',
        _keySingular:   'metafield',

        startup: function () {

            this.parent.on('liquidfire:Spectre::will-save-entity').then(this.hitch('onWillSave'));

            return this.inherited(arguments);
        },

        _find: function (options, q) {

            var clauses = q.clauses(),
                api     = options.event.get('shopify');

            //if we are searching by product, search changes
            if (clauses.where && clauses.where.product) {

                var id = clauses.where.product.primaryValue ? clauses.where.product.primaryValue() : clauses.where.product;
                delete clauses.where.product;

                return this.get(api, options.statement, '/admin/products/' + id + '/metafields.json', clauses.where);

            } else {

                return this.inherited(arguments);

            }

        },

        /**
         * Endpoints get weird with meta fields
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


            } else {

                if (id) {
                    endpoint = '/admin/metafields/' + id + '.json';
                } else {
                    endpoint = '/admin/metafields.json'
                }

                e.set('endpoint', endpoint);

            }



        }

    });

});