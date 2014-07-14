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
    create = require('./create');

// returns package metadata from config.xml with fields 'namespace' and 'name'
function extractMetadata(path) {
    if (fs.existsSync(path.join(path, 'config.xml'))){
        return Q.reject('config.xml does not exist');
    }

    var meta =  { // default values
        namespace: 'io.cordova.hellocordova',
        name: 'HelloCordova'
    };

    // TODO: read real values from config.xml
    //var config = read(path + '/config.xml').split('\n');
    //for (line in config) {
        // in case of cli all values will be updated by cli for you
        // but the script could be used w/o cli so we should correctly populate meta
    //}

    return Q.resolve(meta);
}

module.exports.help = function () {
    Log("WARNING : Make sure to back up your project before updating!");
    Log("Usage: update Path-To-Project ");
    Log("    Path-To-Old-Project : The path the project you would like to update.");
    Log("examples:");
    Log("    update C:\\Users\\anonymous\\Desktop\\MyProject");
};

// updates the cordova.js in project along with the cordova tooling.
module.exports.run = function (argv) {
    var projectpath = argv[2];
    if (!fs.existsSync(projectpath)){
        // if specified project path is not valid then reject promise
        Q.reject("The given path to the project does not exist." +
            " Please provide a path to the project you would like to update.");
    }

    return extractMetadata(projectpath).then(function (metadata) {
        // this could be used to automatically produce correct folder name under cli
        // var projectpath = path.replace(/platforms\\windows8$/, 'platforms\\windows')
        shell.rm('-rf', projectpath);
        // setup args for create.run which requires process.argv-like array
        [metadata.namespace, metadata.name].forEach(function (arg) {
            argv.push(arg);
        });
        return create.run(argv);
    });
};