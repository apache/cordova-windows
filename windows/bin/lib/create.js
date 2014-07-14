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
    fs    = require('fs'),
    path  = require('path'),
    nopt  = require('nopt'),
    shell = require('shelljs'),
    uuid  = require('node-uuid');

// Creates cordova-windows project at specified path with specified namespace, app name and GUID
module.exports.run = function (argv) {

    // Parse args
    var args = nopt({"guid": String}, {}, argv);

    // Set parameters/defaults for create
    var projectPath = args.argv.remain[0];
    if (fs.existsSync(projectPath)){
        return Q.reject("Project directory already exists:\n\t" + projectPath);
    }
    var packageName = args.argv.remain[1] || "Cordova.Example",
        appName     = args.argv.remain[2] || "CordovaAppProj",
        safeAppName = appName.replace(/(\.\s|\s\.|\s+|\.+)/g, '_'),
        guid        = args['guid'] || uuid.v1();

    console.log("Creating Cordova Windows Project:");
    console.log("\tApp Name  : " + appName);
    console.log("\tNamespace : " + packageName);
    console.log("\tPath      : " + projectPath);

    // Copy the template source files to the new destination
    console.log('Copying template to ' + projectPath);
    shell.cp("-rf", path.join(__dirname, '..', '..', 'template', '*'), projectPath);

    // replace specific values in manifests' templates
    ["package.store.appxmanifest", "package.store80.appxmanifest", "package.phone.appxmanifest"].forEach(function (file) {
        var fileToReplace = path.join(projectPath, file);
        shell.sed('-i', /\$guid1\$/g, guid, fileToReplace);
        shell.sed('-i', /\$safeprojectname\$/g, safeAppName, fileToReplace);
        shell.sed('-i', /\$projectname\$/g, packageName, fileToReplace);
    });

    // Delete bld forder and bin folder
    ["bld", "bin", "*.user", "*.suo", "MyTemplate.vstemplate"].forEach(function (file) {
        shell.rm('-rf', path.join(projectPath, file));
    });

    // TODO: Name the project according to the arguments
    // update the solution to include the new project by name
    // version BS
    // index.html title set to project name ?
    
    return Q.resolve();
};

module.exports.help = function () {
    console.log("Usage: create PathToProject [ PackageName [ AppName [--guid=<GUID string>] ] ]");
    console.log("    PathToProject : The path to where you wish to create the project");
    console.log("    PackageName   : The namespace for the project (default is Cordova.Example)");
    console.log("    AppName       : The name of the application (default is CordovaAppProj)");
    console.log("    --guid        : The App's GUID (default is random generated)");
    console.log("examples:");
    console.log("    create C:\\Users\\anonymous\\Desktop\\MyProject");
    console.log("    create C:\\Users\\anonymous\\Desktop\\MyProject io.Cordova.Example AnApp");
};