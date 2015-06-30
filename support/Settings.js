define(['altair/facades/declare',
    'altair/mixins/_DeferredMixin',
    'altair/mixins/_AssertMixin',
    'apollo/_HasSchemaMixin'
], function (declare,
             _DeferredMixin,
             _AssertMixin,
             _HasSchemaMixin) {

    return declare([_DeferredMixin, _AssertMixin, _HasSchemaMixin], {

    });

});