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
    os    = require('os'),
    utils = require('../../template/cordova/lib/utils');

module.exports.help = function () {
    Log("Usage: [ check_reqs | node check_reqs ]");
    Log("examples:");
    Log("    cscript C:\\Users\\anonymous\\cordova-windows\\windows8\\bin\\check_reqs.bat");
    Log("    CordovaWindowsPhone\\bin\\check_reqs");
};

module.exports.run = function () {
    if (os.platform() != 'win32'){
      // Build Universal windows apps available for windows platform only, so we reject on others platforms
        return Q.reject(
            "ERROR: Cordova tooling for Windows 8 requires Windows 8 Professional with the 'msbuild' command\n" +
            "in the PATH environment variable as well as having .NET Framework 4.0 (from WP SDK's)"
        );
    }
    // Check for MSBuild available
    return utils.getMSBuild();
};
