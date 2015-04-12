define(['altair/facades/declare',
    './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint:  '/admin/script_tags.json',
        _keyPlural:     'script_tags',
        _keySingular:   'script_tag'

    });

});