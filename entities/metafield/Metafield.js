define(['altair/facades/declare',
        '../_Base',
        'lodash'
], function (declare, _Base, _) {

    return declare([_Base], {

        mixin: function (values) {

            //modify the value field type based on value_type
            if (values.value_type) {

                var data    = _.cloneDeep(this.schema().data()),
                    schema;

                data.properties.value.type = values.value_type;

                schema = this.parent.nexus('cartridges/Apollo').createSchema(data.properties);
                this._schema = schema;

            }

            return this.inherited(arguments);

        }

    });

});