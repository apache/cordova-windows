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

var Q = require('q'),
    nopt  = require('nopt'),
    path  = require('path'),
    build = require('./build'),
    utils = require('./utils'),
    packages = require('./package');

var ROOT = path.join(__dirname, '..', '..');

module.exports.run = function (argv) {
    if (!utils.isCordovaProject(ROOT)){
        return Q.reject("Could not find project at " + ROOT);
    }

    // parse args
    var args  = nopt({"debug": Boolean, "release": Boolean, "nobuild": Boolean,
        "device": Boolean, "emulator": Boolean, "target": String, "archs": String,
        "phone": Boolean, "store": Boolean, "store80": Boolean
    }, {"store81": "--store", "r" : "--release"}, argv);

    // Validate args
    if (args.debug && args.release) {
        return Q.reject('Only one of "debug"/"release" options should be specified');
    }
    if ((args.device && args.emulator) || ((args.device || args.emulator) && args.target)) {
        return Q.reject('Only one of "device"/"emulator"/"target" options should be specified');
    }
    if ((args.phone && args.store) || ((args.phone || args.store) && args.store80)) {
        return Q.reject('Only one of "phone"/"store"/"store80" options should be specified');
    }

    // Get build/deploy options
    var buildType    = args.release ? "release" : "debug",
        buildArchs   = args.archs ? args.archs.split(' ') : ["anycpu"],
        projectType  = args.phone ? "phone" : args.store80 ? "store80" : "store",
        deployTarget = args.target ? args.target : args.device ? "device" : "emulator";

    // if --nobuild isn't specified then build app first
    var buildPackages = args.nobuild ? Q() : build.run(argv);

    return buildPackages.then(function () {
        return packages.getPackage(projectType, buildType, buildArchs[0]);
    }).then(function(pkg) {
        console.log('\nDeploying ' + pkg.type + ' package to ' + deployTarget);
        return pkg.type == "phone" ?
            packages.deployToPhone(pkg.file, deployTarget) :
            packages.deployToDesktop(pkg.file, deployTarget);
    });
};

module.exports.help = function () {
    console.log("\nUsage: run [ --device | --emulator | --target=<id> ] [ --debug | --release | --nobuild ]");
    console.log("           [ --x86 | --x64 | --arm ] [--phone | --store | --store81 | --store80]");
    console.log("    --device      : Deploys and runs the project on the connected device.");
    console.log("    --emulator    : Deploys and runs the project on an emulator.");
    console.log("    --target=<id> : Deploys and runs the project on the specified target.");
    console.log("    --debug       : Builds project in debug mode.");
    console.log("    --release     : Builds project in release mode.");
    console.log("    --nobuild     : Uses pre-built xap, or errors if project is not built.");
    console.log("    --x86, --x64, --arm");
    console.log("                  : Specifies chip architecture.");
    console.log("    --phone, --store, --store81, --store80");
    console.log("                  : Specifies, what type of project to deploy");
    console.log("");
    console.log("Examples:");
    console.log("    run");
    console.log("    run --emulator");
    console.log("    run --device");
    console.log("    run --target=7988B8C3-3ADE-488d-BA3E-D052AC9DC710");
    console.log("    run --device --release");
    console.log("    run --emulator --debug");
    console.log("");
    process.exit(0);
};