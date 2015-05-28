
/*jshint node: true*/

var path = require('path');

var buildImpl = require('./lib/build');
var requirementsImpl = require('./lib/check_reqs');

function PlatformApi () {
    // Set up basic properties. They probably will be overridden if this API is used by cordova-lib
    this.root = path.join(__dirname, '..', '..');
    this.platform = 'windows';

    if (this.constructor.super_){
        // This should only happen if this class is being instantiated from cordova-lib
        // In this case the arguments is being passed from cordova-lib as well,
        // so we don't need to care about whether they're correct ot not
        this.constructor.super_.apply(this, arguments);
    }
}

PlatformApi.prototype.build = function(context) {
    var buildOptions = context && context.options || [];
    return buildImpl.run(buildOptions);
};

PlatformApi.prototype.requirements = function () {
    return requirementsImpl.check_all();
};

PlatformApi.prototype.getConfigXml = function() {
    return path.join(this.root, 'config.xml');
};

PlatformApi.prototype.getWwwDir = function() {
    return path.join(this.root, 'www');
};

module.exports = PlatformApi;
