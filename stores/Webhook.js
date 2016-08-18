define(['altair/facades/declare',
    './_Base'
], function (declare, _Base) {


    return declare([_Base], {

        _findEndpoint: '/admin/webhooks.json',
        _getEndpoint: '/admin/webhooks/{{_id}}.json',
        _countEndpoint: '/admin/webhooks/count.json',
        _createEndpoint: '/admin/webhooks.json',
        _keyPlural: 'webhooks',
        _keySingular: 'webhook',
        _updateEndpoint: '/admin/webhooks/{{_id}}.json',
        _deleteEndpoint: '/admin/webhooks/{{_id}}.json'

    });

});