/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/

/*jshint node:true*/

var Q     = require('Q');

var MSBuildTools;
try {
    MSBuildTools = require('../../template/cordova/lib/MSBuildTools');
} catch (ex) {
    // If previous import fails, we probably running this script
    // from installed platform and the module location is different.
    MSBuildTools = require('./MSBuildTools');
}

/**
 * Check if current OS is supports building windows platform
 * @return {Promise} Promise either fullfilled or rejected with error message.
 */
var checkOS = function () {
    var platform = process.platform;
    return (platform === 'win32') ?
        Q.resolve(platform):
        // Build Universal windows apps available for windows platform only, so we reject on others platforms
        Q.reject('Cordova tooling for Windows requires Windows OS to build project');
};

/**
 * Checks if MSBuild tools is available.
 * @return {Promise} Promise either fullfilled with MSBuild version
 *                           or rejected with error message.
 */
var checkMSBuild = function () {
    return MSBuildTools.findAvailableVersion()
    .then(function (msbuildTools) {
        // return Q.resolve('MSBuild tools v.' + msbuildTools.version + ' found at ' + msbuildTools.path);
        return Q.resolve(msbuildTools.version);
    }, function () {
        return Q.reject('MSBuild tools not found. Please install MSBuild tools or VS 2013 from ' +
            'https://www.visualstudio.com/downloads/download-visual-studio-vs');
    });
};

module.exports.run = function () {
    return checkOS().then(function () {
        return MSBuildTools.findAvailableVersion();
    });
};

/**
 * Object thar represents one of requirements for current platform.
 * @param {String} id         The unique identifier for this requirements.
 * @param {String} name       The name of requirements. Human-readable field.
 * @param {String} version    The version of requirement installed. In some cases could be an array of strings
 *                            (for example, check_android_target returns an array of android targets installed)
 * @param {Boolean} installed Indicates whether the reuirement is installed or not
 */
var Requirement = function (id, name, version, installed) {
    this.id = id;
    this.name = name;
    this.installed = installed || false;
    this.metadata = {
        version: version,
    };
};

/**
 * Methods that runs all checks one by one and returns a result of checks
 * as an array of Requirement objects. This method intended to be used by cordova-lib check_reqs method
 *
 * @return Promise<Requirement[]> Array of requirements. Due to implementation, promise is always fulfilled.
 */
module.exports.check_all = function() {

    var requirements = [
        new Requirement('os', 'Windows OS'),
        new Requirement('msbuild', 'MSBuild Tools')
    ];

    // Define list of checks needs to be performed
    var checkFns = [checkOS, checkMSBuild];
    // Then execute them one-by-one
    return checkFns.reduce(function (promise, checkFn, idx) {
        // Update each requirement with results
        var requirement = requirements[idx];
        return promise.then(checkFn)
        .then(function (version) {
            requirement.installed = true;
            requirement.metadata.version = version;
        }, function (err) {
            requirement.metadata.reason = err;
        });
    }, Q())
    .then(function () {
        // When chain is completed, return requirements array to upstream API
        return requirements;
    });
};

module.exports.help = function () {
    console.log('Usage: check_reqs or node check_reqs');
};
