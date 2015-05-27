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

var Q      = require('Q'),
    fs     = require('fs'),
    path   = require('path'),
    shell   = require('shelljs'),
    create = require('./create'),
    ConfigParser = require('../../template/cordova/lib/ConfigParser');

// returns package metadata from config.xml with fields 'namespace' and 'name'
function extractMetadata(projectPath) {
    var projectConfig = path.join(projectPath, 'config.xml');
    if (!fs.existsSync(projectConfig)){
        return Q.reject('config.xml does not exist');
    }

    var config = new ConfigParser(projectConfig);
    var meta =  {
        packageName: config.packageName(),
        name: config.name(),
        guid: undefined
    };

    // guid param is used only when adding a platform, and isn't saved anywhere.
    // The only place, where it is being persisted - phone/win10 appxmanifest file,
    // but since win10 introduced just recently, we're can't rely on its manifest
    // for old platform versions.
    var manifestPath = path.join(projectPath, 'package.phone.appxmanifest');
    try {
        var manifest = fs.readFileSync(manifestPath, 'utf-8');
        var matches = /\bPhoneProductId="(.*?)"/gm.exec(manifest);
        if (matches) {
            meta.guid = matches[1];
        }
    } catch (e) { /*ignore IO errors */ }

    return Q.resolve(meta);
}

module.exports.help = function () {
    console.log('WARNING : Make sure to back up your project before updating!');
    console.log('Usage: update PathToProject ');
    console.log('    PathToProject : The path the project you would like to update.');
    console.log('examples:');
    console.log('    update C:\\Users\\anonymous\\Desktop\\MyProject');
};

// updates the cordova.js in project along with the cordova tooling.
module.exports.run = function (argv) {
    var projectPath = argv[2];
    if (!fs.existsSync(projectPath)){
        // if specified project path is not valid then reject promise
        Q.reject('The given path to the project does not exist.' +
            ' Please provide a path to the project you would like to update.');
    }

    return extractMetadata(projectPath)
    .then(function (metadata) {
        shell.rm('-rf', projectPath);

        // setup args for create.run which requires process.argv-like array
        var createArgs = argv.concat([metadata.packageName, metadata.name]);
        if (metadata.guid) {
            createArgs.push('--guid=' + metadata.guid);
        }

        return create.run(createArgs);
    });
};

