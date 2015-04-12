define(['altair/facades/declare',
    './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint:  '/admin/users.json',
        _keyPlural:     'users',
        _keySingular:   'user'

    });

});