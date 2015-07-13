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

var Q     = require('q'),
    fs    = require('fs'),
    /* jshint ignore:start */ // 'path' only used in ignored blocks
    path  = require('path'),
    /* jshint ignore:end */
    proc  = require('child_process');

// neither 'exec' nor 'spawn' was sufficient because we need to pass arguments via spawn
// but also need to be able to capture stdout / stderr
function run(cmd, args, opt_cwd) {
    var d = Q.defer();
    try {
        var child = proc.spawn(cmd, args, {cwd: opt_cwd, maxBuffer: 1024000});
        var stdout = '', stderr = '';
        child.stdout.on('data', function(s) { stdout += s; });
        child.stderr.on('data', function(s) { stderr += s; });
        child.on('exit', function(code) {
            if (code) {
                d.reject(stderr);
            } else {
                d.resolve(stdout);
            }
        });
    } catch(e) {
        console.error('error caught: ' + e);
        d.reject(e);
    }
    return d.promise;
}

function DeploymentTool() {

}

/**
 * Determines whether the requested version of the deployment tool is available.
 * @returns True if the deployment tool can function; false if not.
 */
DeploymentTool.prototype.isAvailable = function() {
    return fs.existsSync(this.path);
};

/**
 * Enumerates devices attached to the development machine.
 * @returns A Promise for an array of objects, which should be passed into other functions to represent the device.
 * @remarks The returned objects contain 'index', 'name', and 'type' properties indicating basic information about them, 
 *    which is limited to the information provided by the system.  Other properties may also be included, but they are 
 *    specific to the deployment tool which created them and are likely used internally.
 */
DeploymentTool.prototype.enumerateDevices = function() {
    return Q.reject('May not use DeploymentTool directly, instead get an instance from DeploymentTool.getDeploymentTool()');
};

/**
 * Installs an app package to the target device.
 * @returns A Promise which will be fulfilled on success or rejected on failure.
 * @param pathToAppxPackage The path to the .appx package to install.
 * @param targetDevice An object returned from a successful call to enumerateDevices.
 * @shouldLaunch Indicates whether to launch the app after installing it.
 * @shouldUpdate Indicates whether to explicitly update the app, or install clean.
 * @pin Optionally provided if the device requires pairing for deployment.
 */
DeploymentTool.prototype.installAppPackage = function(pathToAppxPackage, targetDevice, shouldLaunch, shouldUpdate, pin) {
    return Q.reject('May not use DeploymentTool directly, instead get an instance from DeploymentTool.getDeploymentTool()');
};

/**
 * Uninstalls an app package from the target device.
 * @returns A Promise which will be fulfilled on success or rejected on failure.
 * @param packageInfo The app package name or Phone GUID representing the app.
 * @param targetDevice An object returned from a successful call to enumerateDevices.
 */
DeploymentTool.prototype.uninstallAppPackage = function(packageInfo, targetDevice) {
    return Q.reject('Unable to uninstall any app packages because that feature is not supported.');
};

/**
 * Gets a list of installed apps on the target device.  This function is not supported for
 * Windows Phone 8.1.
 * @param targetDevice {Object} An object returned from a successful call to enumerateDevices.
 * @returns A Promise for an array of app names.
 */
DeploymentTool.prototype.getInstalledApps = function(targetDevice) {
    return Q.reject('Unable to get installed apps because that feature is not supported.');
};

/**
 * Launches an app on the target device.  This function is not supported for Windows 10.
 * @param packageInfo {String} The app package name or Phone GUID representing the app.
 * @param targetDevice {Object} An object returned from a successful call to enumerateDevices.
 * @returns A Promise for when the app is launched.
 */
DeploymentTool.prototype.launchApp = function(packageInfo, targetDevice) {
    return Q.reject('Unable to launch an app because that feature is not supported.');
};

/**
 * Gets a DeploymentTool to deploy to devices or emulators.
 * @param targetOsVersion {String} The version of the 
 */
DeploymentTool.getDeploymentTool = function(targetOsVersion) {
    if (targetOsVersion === '8.1') {
        return new AppDeployCmdTool(targetOsVersion);
    }
    else {
        return new WinAppDeployCmdTool(targetOsVersion);
    }
};

// DeviceInfo is an opaque object passed to install/uninstall.
// Implementations of DeploymentTool can populate it with any additional
//  information required for accessing them.
function DeviceInfo(deviceIndex, deviceName, deviceType) {
    this.index = deviceIndex;
    this.name = deviceName;
    this.type = deviceType;
}

DeviceInfo.prototype.toString = function() {
    return this.index + '. ' + this.name + ' (' + this.type + ')';
};

function AppDeployCmdTool(targetOsVersion) {
    if (!(this instanceof AppDeployCmdTool))
        throw new ReferenceError('Only create an AppDeployCmdTool as an instance object.');

    DeploymentTool.call(this);
    this.targetOsVersion = targetOsVersion;

    /* jshint ignore:start */ /* Ignore jshint to use dot notation for 2nd process.env access for consistency */
    var programFilesPath = process.env['ProgramFiles(x86)'] || process.env['ProgramFiles'];
    this.path = path.join(programFilesPath, 'Microsoft SDKs', 'Windows Phone', 'v' + this.targetOsVersion, 'Tools', 'AppDeploy', 'AppDeployCmd.exe');
    /* jshint ignore:end */
}

AppDeployCmdTool.prototype = Object.create(DeploymentTool.prototype);
AppDeployCmdTool.prototype.constructor = AppDeployCmdTool;

AppDeployCmdTool.prototype.enumerateDevices = function() {
    var that = this;
    //  9              Emulator 8.1 720P 4.7 inch\r\n
    //    maps to
    // [(line), 9, 'Emulator 8.1 720P 4.7 inch']
    // Expansion is: space, index, spaces, name
    var LINE_TEST = /^\s(\d+?)\s+(.+?)$/m;
    return run(that.path, ['/EnumerateDevices']).then(function(result) {
        var lines = result.split('\n');
        var matchedLines = lines.filter(function(line) {
            return LINE_TEST.test(line);
        });

        var devices = matchedLines.map(function(line, arrayIndex) {
            var match = line.match(LINE_TEST);
            var index = parseInt(match[1], 10);
            var name = match[2];

            var shorthand = '';
            var type = 'emulator';

            if (name === 'Device') {
                shorthand = 'de';
                type = 'device';
            } else if (arrayIndex === 1) {
                shorthand = 'xd';
            } else {
                shorthand = index;
            }
            var deviceInfo = new DeviceInfo(index, name, type);
            deviceInfo.__sourceLine = line;
            deviceInfo.__shorthand = shorthand;
            return deviceInfo;
        });

        return devices;
    });
};

AppDeployCmdTool.prototype.installAppPackage = function(pathToAppxPackage, targetDevice, shouldLaunch, shouldUpdate, pin) {
    var command = shouldUpdate ? '/update' : '/install';
    if (shouldLaunch) {
        command += 'launch';
    }

    return run(this.path, [command, pathToAppxPackage, '/targetdevice:' + targetDevice.__shorthand]);
};

AppDeployCmdTool.prototype.uninstallAppPackage = function(packageInfo, targetDevice) {
    return run(this.path, ['/uninstall', packageInfo, '/targetdevice:' + targetDevice.__shorthand]);
};

AppDeployCmdTool.prototype.launchApp = function(packageInfo, targetDevice) {
    return run(this.path, ['/launch', packageInfo, '/targetdevice:' + targetDevice.__shorthand]);
};

function WinAppDeployCmdTool(targetOsVersion) {
    if (!(this instanceof WinAppDeployCmdTool))
        throw new ReferenceError('Only create a WinAppDeployCmdTool as an instance object.');

    DeploymentTool.call(this);
    this.targetOsVersion = targetOsVersion;
    /* jshint ignore:start */ /* Ignore jshint to use dot notation for 2nd process.env access for consistency */
    var programFilesPath = process.env['ProgramFiles(x86)'] || process.env['ProgramFiles'];
    this.path = path.join(programFilesPath, 'Windows Kits', '10', 'bin', 'x86', 'WinAppDeployCmd.exe');
    /* jshint ignore:end */
}

WinAppDeployCmdTool.prototype = Object.create(WinAppDeployCmdTool);
WinAppDeployCmdTool.prototype.constructor = WinAppDeployCmdTool;

WinAppDeployCmdTool.prototype.enumerateDevices = function() {
    var that = this;
    // 127.0.0.1   00000015-b21e-0da9-0000-000000000000    Lumia 1520 (RM-940)\r
    //  maps to
    // [(line), '127.0.0.1', '00000015-b21e-0da9-0000-000000000000', 'Lumia 1520 (RM-940)']
    // The expansion is: IP address, spaces, GUID, spaces, text name
    var LINE_TEST = /^([\d\.]+?)\s+([\da-fA-F\-]+?)\s+(.+)$/m;

    return run(that.path, ['devices']).then(function(result) {
        var lines = result.split('\n');
        var matchedLines = lines.filter(function(line) {
            return LINE_TEST.test(line);
        });

        var devices = matchedLines.map(function(line, arrayIndex) {
            var match = line.match(LINE_TEST);
            var ip = match[1];
            var guid = match[2];
            var name = match[3];
            var type = 'device';

            var deviceInfo = new DeviceInfo(arrayIndex, name, type);
            deviceInfo.__ip = ip;
            deviceInfo.__guid = guid;

            return deviceInfo;
        });

        return devices;
    });
};

WinAppDeployCmdTool.prototype.installAppPackage = function(pathToAppxPackage, targetDevice, shouldLaunch, shouldUpdate, pin) {
    if (shouldLaunch) {
        console.warn('Warning: Cannot launch app with current version of Windows 10 SDK tools.');
        console.warn('         You will have to launch the app after installation is completed.');
    }

    var args = [shouldUpdate ? 'update' : 'install', '-file', pathToAppxPackage, '-ip', targetDevice.__ip];
    if (pin) {
        args.push('-pin');
        args.push(pin);
    }

    return run(this.path, args).then(function() {
        console.log('Deployment completed successfully.');
    });
};

WinAppDeployCmdTool.prototype.uninstallAppPackage = function(packageInfo, targetDevice) {
    return run(this.path, ['uninstall', '-package', packageInfo, '-ip', targetDevice.__ip]);
};

// usage: require('deployment').getDeploymentTool('8.1');
module.exports = DeploymentTool;
