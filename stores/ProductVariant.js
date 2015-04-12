define(['altair/facades/declare',
        './_Base',
        'altair/Lifecycle',
        'altair/cartridges/database/Statement',
        'altair/cartridges/database/cursors/Array',
], function (declare, _Base, Lifecycle, Statement, ArrayCursor) {


    return declare([_Base, Lifecycle], {

        _findEndpoint:  '/admin/products/{{productId}}/variants.json',
        _createEndpoint: '/admin/products/{{productId}}/variants.json',
        _updateEndpoint: '/admin/products/{{productId}}/variants/{{id}}.json',
        _keyPlural:     'variants',
        _keySingular:   'variant',

        startup: function () {

            this.parent.on('liquidfire:Spectre::will-save-entity', {
                store: this
            }).then(this.hitch('onWillSave'));

            return this.inherited(arguments);
        },

        _find: function (options, q) {

            var clauses = q.clauses(),
                api     = options.shopify || options.event.get('shopify');

            //if we are searching by product, search changes
            if (clauses.where && clauses.where.product) {

                var id = clauses.where.product.primaryValue ? clauses.where.product.primaryValue() : clauses.where.product;
                delete clauses.where.product;

                return this.get(api, options.statement, '/admin/products/' + id + '/variants.json', clauses.where);

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
                    endpoint = '/admin/products/' + product + '/variants/' + id + '.json';
                } else {
                    endpoint = '/admin/products/' + product + '/variants.json'
                }

                e.set('endpoint', endpoint);


            } else {

                if (id) {
                    endpoint = '/admin/variants/' + id + '.json';
                } else {
                    endpoint = '/admin/variants.json'
                }

                e.set('endpoint', endpoint);

            }



        }

    });

});