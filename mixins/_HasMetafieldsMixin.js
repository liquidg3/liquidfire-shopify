define(['altair/facades/declare',
    'altair/mixins/_DeferredMixin',
    'altair/mixins/_AssertMixin',
    'lodash'
], function (declare,
             _DeferredMixin,
             _AssertMixin,
             _) {

    return declare([_DeferredMixin, _AssertMixin], {

        _metaFieldPredicate: false,
        getMetafields: function (defaultValue, options, config) {

            var _config = config || {},
                _options = options || {},
                value,
                toShopifyValue = _config.methods && _config.methods[0] === 'toShopifyValue',
                shopify = _config.shopify || this.shopify;

            //only do many if we are sending to shopify
            _options.many = toShopifyValue;
            value = this._get('metafields', defaultValue, _options, config),

                _config.shopify = shopify;

            //if we are going to shopify, simply return the value, otherwise, only return
            //if it's a promise
            if (toShopifyValue || value) {

                return value;

            } else if (_config.shopify && (_options.fetch || (!_config['methods'] || _config['methods'][0] === 'toJsValue'))) {

                this.assert(this._metaFieldPredicate, 'You must set _metaFieldPredicate to a field name (customer, product, etc.) for the _HasMetafieldsMixin.');

                //so this._get('metafields') will return something next time
                this.values.metafields = value = this.parent.entity('liquidfire:Shopify/entities/Metafield').then(function (metafields) {

                    return metafields.find(_config).where(this._metaFieldPredicate, '===', this).execute();

                }.bind(this)).then(function (fields) {

                    return fields.toArray();

                }).then(function (fields) {

                    var v = {};

                    _.each(fields, function (field) {

                        if (!v[field.values.namespace]) {
                            v[field.values.namespace] = {};
                        }

                        v[field.values.namespace][field.values.key] = field.values.value_type === 'integer' ? parseInt(field.values.value) : field.values.value;

                    });

                    return fields.length > 0 ? v : null;

                }.bind(this));

            }

            return value;

        }

    });

});