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
var fs = require('fs');
var shell = require('shelljs');
var Version = require('./Version');
var events = require('cordova-common').events;
var spawn = require('cordova-common').superspawn.spawn;

function MSBuildTools (version, path) {
    this.version = version;
    this.path = path;
}

MSBuildTools.prototype.buildProject = function (projFile, buildType, buildarch, buildFlags) {
    events.emit('log', 'Building project: ' + projFile);
    events.emit('log', '\tConfiguration : ' + buildType);
    events.emit('log', '\tPlatform      : ' + buildarch);
    events.emit('log', '\tBuildflags    : ' + buildFlags);
    events.emit('log', '\tMSBuildTools  : ' + this.path);

    // Additional requirement checks
    var checkWinSDK = function (target_platform) {
        return require('./check_reqs').isWinSDKPresent(target_platform);
    };
    var checkPhoneSDK = function () {
        return require('./check_reqs').isPhoneSDKPresent();
    };

    // default build args
    var args = ['/clp:NoSummary;NoItemAndPropertyList;Verbosity=minimal', '/nologo',
        '/p:Configuration=' + buildType,
        '/p:Platform=' + buildarch];

    // add buildFlags if present
    if (buildFlags) {
        args = args.concat(buildFlags);
    }

    var that = this;
    var promise;

    // Check if SDK required to build the respective platform is present. If not present, return with corresponding error, else call msbuild.
    if (projFile.indexOf('CordovaApp.Phone.jsproj') > -1) {
        promise = checkPhoneSDK();
    } else if (projFile.indexOf('CordovaApp.Windows.jsproj') > -1) {
        promise = checkWinSDK('8.1');
    } else {
        promise = checkWinSDK('10.0');
    }

    return promise.then(function () {
        return spawn(path.join(that.path, 'msbuild'), [projFile].concat(args), { stdio: 'inherit' });
    });
};

// returns full path to msbuild tools required to build the project and tools version
// check_reqs.js -> run()
module.exports.findAvailableVersion = function () {
    var versions = ['15.0', '14.0', '12.0', '4.0'];

    return Q.all(versions.map(checkMSBuildVersion)).then(function (versions) {
        console.log('findAvailableVersion', versions);
        // select first msbuild version available, and resolve promise with it
        var msbuildTools = versions[0] || versions[1] || versions[2] || versions[3];

        return msbuildTools ? Q.resolve(msbuildTools) : Q.reject('MSBuild tools not found');
    });
};

// build.js -> run()
// check_reqs.js -> checkMSBuild()
module.exports.findAllAvailableVersions = function () {
    // CB-11548 use VSINSTALLDIR environment if defined to find MSBuild. If VSINSTALLDIR
    // is not specified or doesn't contain the MSBuild path we are looking for - fall back
    // to default discovery mechanism.
    console.log('findAllAvailableVersions');
    if (process.env.VSINSTALLDIR) {
        var msBuildPath = path.join(process.env.VSINSTALLDIR, 'MSBuild/15.0/Bin');
        return module.exports.getMSBuildToolsAt(msBuildPath)
            .then(function (msBuildTools) {
                return [msBuildTools];
            }).catch(findAllAvailableVersionsFallBack);
    }

    return findAllAvailableVersionsFallBack();
};

function findAllAvailableVersionsFallBack () {
    var versions = ['15.0', '14.0', '12.0', '4.0'];
    console.log('findAllAvailableVersionsFALLBACK');

    events.emit('verbose', 'Searching for available MSBuild versions...');

    return Q.all(versions.map(checkMSBuildVersion)).then(function (unprocessedResults) {
        return unprocessedResults.filter(function (item) {
            return !!item;
        });
    });
}

/**
 * Gets MSBuildTools instance for user-specified location
 *
 * @param {String}  location  FS location where to search for MSBuild
 * @returns  Promise<MSBuildTools>  The MSBuildTools instance at specified location
 */
module.exports.getMSBuildToolsAt = function (location) {
    console.log('getMSBuildToolsAt', location);
    var msbuildExe = path.resolve(location, 'msbuild');

    // TODO: can we account on these params availability and printed version format?
    return spawn(msbuildExe, ['-version', '-nologo'])
        .then(function (output) {
            // MSBuild prints its' version as 14.0.25123.0, so we pick only first 2 segments
            var version = output.match(/^(\d+\.\d+)/)[1];
            console.log('return new MSBuildTools', version, location)
            return new MSBuildTools(version, location);
        });
};

function checkMSBuildVersion (version) {
    console.log('checkMSBuildVersion', version);
    
    // first, check if we have a VS 2017+ with such a version
    var willows = module.exports.getWillowInstallations();
    console.log('willows', willows);
    var correspondingWillows = willows.filter(function (inst) {
        console.log('correspondingWillow', inst.version === version);
        return inst.version === version;
    });
    console.log('correspondingWillows', correspondingWillows);
    var correspondingWillow = correspondingWillows[1];
    if (correspondingWillow) {
        // TODO adapt for 15.5=>15.0 case
        version = '15.0';
        var toolsPath = path.join(correspondingWillow.path, 'MSBuild', version, 'Bin');
        console.log('correspondingWillow:', toolsPath);
        if (shell.test('-e', toolsPath)) {
            console.log('correspondingWillow:', toolsPath, module.exports.getMSBuildToolsAt(toolsPath));
            // TODO check for JavaScript folder
            return module.exports.getMSBuildToolsAt(toolsPath);
        }
    }

    // older vs versions that were registered in registry
    return spawn('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\MSBuild\\ToolsVersions\\' + version, '/v', 'MSBuildToolsPath'])
        .then(function (output) {
            console.log('spawn', output);
            // fetch msbuild path from 'reg' output
            var toolsPath = /MSBuildToolsPath\s+REG_SZ\s+(.*)/i.exec(output);
            if (toolsPath) {
                toolsPath = toolsPath[1];
                // CB-9565: Windows 10 invokes .NET Native compiler, which only runs on x86 arch,
                // so if we're running an x64 Node, make sure to use x86 tools.
                if ((version === '15.0' || version === '14.0') && toolsPath.indexOf('amd64') > -1) {
                    toolsPath = path.resolve(toolsPath, '..');
                }
                events.emit('verbose', 'Found MSBuild v' + version + ' at ' + toolsPath);
                return new MSBuildTools(version, toolsPath);
            }
        }).catch(function (err) { /* eslint handle-callback-err : 0 */
            console.log('no reg result', version, err);
            // if 'reg' exits with error, assume that registry key not found
        });
}

// returns an array of available UAP Versions
// prepare.js
module.exports.getAvailableUAPVersions = function () {
    var programFilesFolder = process.env['ProgramFiles(x86)'] || process.env['ProgramFiles'];
    // No Program Files folder found, so we won't be able to find UAP SDK
    if (!programFilesFolder) return [];

    var uapFolderPath = path.join(programFilesFolder, 'Windows Kits', '10', 'Platforms', 'UAP');
    if (!shell.test('-e', uapFolderPath)) {
        return []; // No UAP SDK exists on this machine
    }

    var result = [];
    shell.ls(uapFolderPath).filter(function (uapDir) {
        return shell.test('-d', path.join(uapFolderPath, uapDir));
    }).map(function (folder) {
        return Version.tryParse(folder);
    }).forEach(function (version, index) {
        if (version) {
            result.push(version);
        }
    });

    return result;
};

/**
 * Lists all VS 2017+ instances dirs in ProgramData
 *
 * @return {String[]} List of paths to all VS2017+ instances
 */
function getWillowProgDataPaths () {
    if (!process.env.systemdrive) {
        // running on linux/osx?
        return [];
    }
    var instancesRoot = path.join(process.env.systemdrive, 'ProgramData/Microsoft/VisualStudio/Packages/_Instances');
    if (!shell.test('-d', instancesRoot)) {
        // can't seem to find VS instances dir, return empty result
        return [];
    }

    return fs.readdirSync(instancesRoot).map(function (file) {
        var instanceDir = path.join(instancesRoot, file);
        if (shell.test('-d', instanceDir)) {
            return instanceDir;
        }
    }).filter(function (progDataPath) {
        // make sure state.json exists
        return shell.test('-e', path.join(progDataPath, 'state.json'));
    });
}

/**
 * Lists all installed VS 2017+ versions
 *
 * @return {Object[]} List of all VS 2017+ versions
 */
module.exports.getWillowInstallations = function () {
    var progDataPaths = getWillowProgDataPaths();
    var installations = [];
    progDataPaths.forEach(function (progDataPath) {
        try {
            var stateJsonPath = path.join(progDataPath, 'state.json');
            var fileContents = fs.readFileSync(stateJsonPath, 'utf-8');
            var state = JSON.parse(fileContents);
            // get only major and minor version
            var version = state.product.version.match(/^(\d+\.\d+)/)[1];
            installations.push({ version: version, path: state.installationPath });
        } catch (err) {
            // something's wrong, skip this one
        }
    });
    return installations;
};

// gets the latest MSBuild version from a list of versions
module.exports.getLatestMSBuild = function (allMsBuildVersions) {
    events.emit('verbose', 'getLatestMSBuild');

    var availableVersions = allMsBuildVersions
        .filter(function (buildTools) {
            // Sanitize input - filter out tools w/ invalid versions
            return Version.tryParse(buildTools.version);
        }).sort(function (a, b) {
            // Sort tools list - use parsed Version objects for that
            // to respect both major and minor versions segments
            var parsedA = Version.fromString(a.version);
            var parsedB = Version.fromString(b.version);

            if (parsedA.gt(parsedB)) return -1;
            if (parsedA.eq(parsedB)) return 0;
            return 1;
        });

    console.log('availableVersions', availableVersions);

    if (availableVersions.length > 0) {
        // After sorting the first item will be the highest version available
        return availableVersions[0];
    }
};
