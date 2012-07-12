var device = require('cordova/plugin/win7/device');

module.exports = {
    id: device.platform,
    initialize: function () {
    },
    objects: {
        device: {
            path: 'cordova/plugin/win7/device'
        }
    }
};
