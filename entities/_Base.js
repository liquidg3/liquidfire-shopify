define(['altair/facades/declare',
    'apollo/_HasSchemaMixin'
], function (declare, _HasSchemaMixin) {

    return declare([_HasSchemaMixin], {

        mixin: function (values) {

            //map ID field
            if (values['id']) {
                values[this.primaryProperty().name] = values['id'];
            }

            return this.inherited(arguments);
        }


    });

});