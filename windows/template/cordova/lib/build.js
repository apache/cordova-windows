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

var Q     = require('Q'),
    path  = require('path'),
    nopt  = require('nopt'),
    spawn = require('./spawn'),
    utils = require('./utils');

var ROOT = path.join(__dirname, '..', '..');

// builds cordova-windows application with parameters provided.
// See 'help' function for args list
module.exports.run = function run (argv) {
    // reject promise if project is not valid
    if (!utils.isCordovaProject(ROOT)){
        return Q.reject("Could not find project at " + ROOT);
    }

    // parse args
    var args = nopt({"debug": Boolean, "release": Boolean, "archs": [String]}, {"-r": "--release"}, argv);
   
    // Validate args
    if (args.debug && args.release) {
        return Q.reject('Only one of "debug"/"release" options should be specified');
    }
    
    // get build options/defaults
    var buildType = args.release ? "release" : "debug",
        buildArchs = args.archs ? args.archs.split(' ') : ["anycpu"];

    // chain promises each for previous for each array member
    return buildArchs.reduce(function(promise, arch) {
        // support for "any cpu" specified with or without space
        var buildarch = arch !== "anycpu" ? arch : "any cpu";
        return promise.then(function() {
            return utils.getMSBuild();
        }).then(function(msbuild) {
            console.log("\nBuilding Cordova Windows Project:");
            console.log("\tConfiguration : " + buildType);
            console.log("\tPlatform      : " + buildarch);
            console.log("\tDirectory     : " + ROOT);
            console.log("\tMSBuildToolsPath: " + msbuild.path);
            
            if (msbuild.version == '4.0') {
                console.warn("\r\nWarning. Windows 8.1 and Windows Phone 8.1 target platforms are not supported on this development machine and will be skipped.");
                console.warn("Please install OS Windows 8.1 and Visual Studio 2013 Update2 in order to build for Windows 8.1 and Windows Phone 8.1.\r\n");
            }
            var solution = msbuild.version == '4.0' ?
                path.join(ROOT, 'CordovaApp.vs2012.sln') :
                path.join(ROOT, 'CordovaApp.sln');

            var args = [solution,
                '/clp:NoSummary;NoItemAndPropertyList;Verbosity=minimal', '/nologo',
                '/p:Configuration=' + buildType,
                '/p:Platform=' + buildarch];
            
            return spawn(path.join(msbuild.path, 'msbuild'), args);
        });
    }, Q());
};

// help/usage function
module.exports.help = function help() {
    console.log("");
    console.log("Usage: build [ --debug | --release ] [--archs=\"<list of architectures...>\"]");
    console.log("    --help    : Displays this dialog.");
    console.log("    --debug   : builds project in debug mode. (Default)");
    console.log("    --release : builds project in release mode.");
    console.log("    -r        : shortcut :: builds project in release mode.");
    console.log("    --archs   : Builds project binaries for specific chip architectures. `anycpu` + `arm` + `x86` + `x64` are supported.");
    console.log("examples:");
    console.log("    build ");
    console.log("    build --debug");
    console.log("    build --release");
    console.log("    build --release --archs=\"arm x86\"");
    console.log("");
    process.exit(0);
};
