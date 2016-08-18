define(['altair/facades/declare',
    'apollo/_HasSchemaMixin'
], function (declare, _HasSchemaMixin) {

    return declare([_HasSchemaMixin], {

        mixin: function (values) {

            //map ID field
            if (values && values['id']) {
                values[this.primaryProperty().name] = values['id'];
            }

            return this.inherited(arguments);
        },

        /**
         * Getters for entity fields need find options, pass them always.
         *
         * @param field
         * @param defaultValue
         * @param options
         * @param config
         * @returns {*}
         */
        get: function (field, defaultValue, options, config) {


            var _config = config || {},
                methodName = this.toGetter(field);

            //configure options if we can
            if (!_config.findOptions || !_config.findOptions.shopify) {
                _config.findOptions = _config.findOptions || {};
                _config.findOptions.shopify = this.shopify;
            }

            if (typeof this[methodName] === 'function') {
                return this[methodName](defaultValue, options, _config);
            }

            return this._get(field, defaultValue, options, _config);


        }


    });

});