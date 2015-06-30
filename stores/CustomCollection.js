define(['altair/facades/declare',
    './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint:  '/admin/custom_collections.json',
        _getEndpoint:   '/admin/custom_collections/{{_id}}.json',
        _keyPlural:     'custom_collections',
        _keySingular:   'custom_collection',

    });

});