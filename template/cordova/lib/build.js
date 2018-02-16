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

var Q = require('q');
var path = require('path');
var shell = require('shelljs');
// var prepare = require('./prepare');
// var AppxManifest = require('./AppxManifest');

// var ROOT = path.resolve(__dirname, '../..');

// these things could be useful if `prepare` doesn't properly do it by itself
/*
module.exports.run = function run (buildOptions) {

        ...

            // Apply build related configs
            prepare.updateBuildConfig(buildConfig);

            if (buildConfig.publisherId) {
                updateManifestWithPublisher(buildConfig, myBuildTargets);
            }

            cleanIntermediates();

};

// Note: This function is very narrow and only writes to the app manifest if an update is done.  See CB-9450 for the
// reasoning of why this is the case.
function updateManifestWithPublisher (config, myBuildTargets) {
    if (!config.publisherId) return;

    var manifestFiles = myBuildTargets.map(function (proj) {
        return projFilesToManifests[proj];
    });
    manifestFiles.forEach(function (file) {
        var manifest = AppxManifest.get(path.join(ROOT, file));
        manifest.getIdentity().setPublisher(config.publisherId);
        manifest.write();
    });
}

function cleanIntermediates () {
    var buildPath = path.join(ROOT, 'build');
    if (shell.test('-e', buildPath)) {
        shell.rm('-rf', buildPath);
    }
}
*/

// cleans the project, removes AppPackages and build folders.
module.exports.clean = function () {
    var projectPath = this.root;
    ['AppPackages', 'build']
        .forEach(function (dir) {
            shell.rm('-rf', path.join(projectPath, dir));
        });
    return Q.resolve();
};
