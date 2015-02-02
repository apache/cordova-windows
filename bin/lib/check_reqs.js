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
    MSBuildTools = require('../../template/cordova/lib/MSBuildTools');

module.exports.run = function () {
    if (os.platform() != 'win32'){
      // Build Universal windows apps available for windows platform only, so we reject on others platforms
        return Q.reject('ERROR: Cordova tooling for Windows requires Windows OS');
    }
    // Check whther MSBuild Tools are available
    return MSBuildTools.findAvailableVersion();
};

module.exports.help = function () {
    console.log('Usage: check_reqs or node check_reqs');
};
