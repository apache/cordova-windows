/**
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
    rewire = require('rewire'),
    platformRoot = '../../template',
    buildTools = rewire(platformRoot + '/cordova/lib/MSBuildTools.js');

var fakeToolsPath = function (version) {
    return "C:\\Program Files (x86)\\MSBuild\\" + version;
};

describe('findAvailableVersion method tests', function(){

    var checkMSBuildVersionOriginal;

    var checkMSBuildVersionFake = function (availableVersions, version) {
        var MSBuildTools = buildTools.__get__('MSBuildTools');
        return (availableVersions.indexOf(version) >= 0) ? Q.resolve(new MSBuildTools(version, fakeToolsPath(version))) : Q.resolve(null);
    };

    var versionTest = function (availableVersions, version) {
        var done = false;

        buildTools.__set__('checkMSBuildVersion', checkMSBuildVersionFake.bind(null, availableVersions));
        buildTools.findAvailableVersion().then(function (msbuildTools) {
            expect(msbuildTools).not.toBeNull();
            expect(msbuildTools.version).toBeDefined();
            expect(msbuildTools.path).toBeDefined();
            expect(msbuildTools.version).toBe(version);
            expect(msbuildTools.path).toBe(fakeToolsPath(version));
            done = true;
        });

        waitsFor(function () {return done; });
    }

    beforeEach(function () {
        checkMSBuildVersionOriginal = buildTools.__get__('checkMSBuildVersion');
    });

    afterEach(function () {
        buildTools.__set__('checkMSBuildVersion', checkMSBuildVersionOriginal);
    });

    it('should find 14.0 available version if 12.0 is unavailable', function(){
        versionTest(['14.0'], '14.0');
    });

    it('should select 14.0 available version even if 12.0 is also available', function(){
        versionTest(['14.0', '12.0', '4.0'], '14.0');
    });

    it('should find 12.0 available version if 14.0 is unavailable', function(){
        versionTest(['12.0', '4.0'], '12.0');
    });

    it('should find 4.0 available version if neither 12.0 nor 14.0 are available', function(){
        versionTest(['4.0'], '4.0');
    });

    it('should produce an error if there is no available versions', function(){
        var done    = false,
            version = '14.0';

        buildTools.__set__('checkMSBuildVersion', checkMSBuildVersionFake.bind(null, []));
        buildTools.findAvailableVersion().then(function (msbuildTools) {
            expect(false).toBe(true);
            done = true;
        }, function(error){
            expect(error).toBeDefined();
            expect(error).toBe('MSBuild tools not found');
            done = true;
        });

        waitsFor(function () {return done; });
    });
});

describe('checkMSBuildVersion function tests', function(){

    var checkMSBuildVersion = buildTools.__get__('checkMSBuildVersion'),
        execOriginal;

    beforeEach(function () {
        execOriginal = buildTools.__get__('exec');
    });

    afterEach(function () {
        buildTools.__set__('exec', execOriginal);
    });

    it('should return valid version and path', function(){
        var version  = '14.0';

        buildTools.__set__('exec', function(cmd) {
            return Q.resolve("\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\MSBuild\\ToolsVersions\\12.0\r\n\tMSBuildToolsPath\tREG_SZ\t" + fakeToolsPath(version) + "\r\n\r\n");
        });

        checkMSBuildVersion(version).then(function (actual) {
            expect(actual.version).toBe(version);
            expect(actual.path).toBe(fakeToolsPath(version));
        });
    });

    it('should return null if no tools found for version', function(){

        buildTools.__set__('exec', function(cmd) {
            return Q.resolve('ERROR: The system was unable to find the specified registry key or value.');
        });

        checkMSBuildVersion('14.0').then(function (actual) {
            expect(actual).toBeNull();
        });
    });

    it('should return null on internal error', function(){

        buildTools.__set__('exec', function(cmd) {
            return Q.reject();
        });

        checkMSBuildVersion('14.0').then(function (actual) {
            expect(actual).toBeNull();
        });
    });
});

describe('MSBuildTools object tests', function(){

    var MSBuildTools = buildTools.__get__('MSBuildTools'),
        spawnOriginal;

    beforeEach(function () {
        spawnOriginal = buildTools.__get__('spawn');
    });

    afterEach(function () {
        buildTools.__set__('spawn', spawnOriginal);
    });

    it('should have fields and methods defined', function() {

        var version   = '14.0',
            toolsPath = fakeToolsPath(version),
            actual    = new MSBuildTools(version, toolsPath);

        expect(actual.path).toBeDefined();
        expect(actual.path).toBe(toolsPath);
        expect(actual.version).toBeDefined();
        expect(actual.version).toBe(version);
        expect(actual.buildProject).toBeDefined();
    });
});

