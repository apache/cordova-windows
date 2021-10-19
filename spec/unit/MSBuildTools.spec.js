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
var shell = require('shelljs');
var rewire = require('rewire');
var platformRoot = '../../template';
var buildTools = rewire(platformRoot + '/cordova/lib/MSBuildTools.js');
var MSBuildTools = buildTools.__get__('MSBuildTools');
var Version = require(platformRoot + '/cordova/lib/Version.js');

var fakeToolsPath = function (version) {
    return 'C:\\Program Files (x86)\\MSBuild\\' + version;
};

describe('findAvailableVersion method', function () {
    var checkMSBuildVersionOriginal;

    var checkMSBuildVersionFake = function (availableVersions, version) {
        var MSBuildTools = buildTools.__get__('MSBuildTools');
        return (availableVersions.indexOf(version) >= 0) ? Promise.resolve(new MSBuildTools(version, fakeToolsPath(version))) : Promise.resolve(null);
    };

    var versionTest = function (availableVersions, version) {
        buildTools.__set__('checkMSBuildVersion', checkMSBuildVersionFake.bind(null, availableVersions));
        return buildTools.findAvailableVersion().then(function (msbuildTools) {
            expect(msbuildTools).not.toBeNull();
            expect(msbuildTools.version).toBeDefined();
            expect(msbuildTools.path).toBeDefined();
            expect(msbuildTools.version).toBe(version);
            expect(msbuildTools.path).toBe(fakeToolsPath(version));
        });
    };

    beforeEach(function () {
        checkMSBuildVersionOriginal = buildTools.__get__('checkMSBuildVersion');
    });

    afterEach(function () {
        buildTools.__set__('checkMSBuildVersion', checkMSBuildVersionOriginal);
    });

    it('spec.1 should find 14.0 available version if 12.0 is unavailable', function () {
        return versionTest(['14.0'], '14.0');
    });

    it('spec.2 should select 14.0 available version even if 12.0 is also available', function () {
        return versionTest(['14.0', '12.0', '4.0'], '14.0');
    });

    it('spec.3 should find 12.0 available version if 14.0 is unavailable', function () {
        return versionTest(['12.0', '4.0'], '12.0');
    });

    it('spec.4 should find 4.0 available version if neither 12.0 nor 14.0 are available', function () {
        return versionTest(['4.0'], '4.0');
    });

    it('spec.5 should produce an error if there is no available versions', function () {
        buildTools.__set__('checkMSBuildVersion', checkMSBuildVersionFake.bind(null, []));
        return buildTools.findAvailableVersion().then(
            () => fail('Expected promise to be rejected'),
            error => expect(error).toBeDefined()
        );
    });
});

describe('checkMSBuildVersion method', function () {
    var checkMSBuildVersion = buildTools.__get__('checkMSBuildVersion');

    var spawnOriginal = buildTools.__get__('spawn');
    var spawnSpy = jasmine.createSpy('spawn');

    beforeEach(function () {
        buildTools.__set__('spawn', spawnSpy);
    });

    afterEach(function () {
        buildTools.__set__('spawn', spawnOriginal);
    });

    it('spec.6 should return valid version and path', function () {
        var version = '14.0';

        spawnSpy.and.returnValue(Promise.resolve(
            '\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\MSBuild\\ToolsVersions\\12.0\r\n\t' +
            'MSBuildToolsPath\tREG_SZ\t' + fakeToolsPath(version) + '\r\n\r\n')
        );

        return checkMSBuildVersion(version).then(function (actual) {
            expect(actual.version).toBe(version);
            expect(actual.path).toBe(fakeToolsPath(version));
        });
    });

    it('spec.7 should return null if no tools found for version', function () {
        spawnSpy.and.returnValue(Promise.resolve('ERROR: The system was unable to find the specified registry key or value.'));

        return checkMSBuildVersion('14.0').then(function (actual) {
            expect(actual).not.toBeDefined();
        });
    });

    it('spec.8 should return null on internal error', function () {
        spawnSpy.and.returnValue(Promise.reject());

        return checkMSBuildVersion('14.0').then(function (actual) {
            expect(actual).not.toBeDefined();
        });
    });
});

describe('MSBuildTools object', function () {
    it('spec.9 should have fields and methods defined', function () {
        var version = '14.0';
        var toolsPath = fakeToolsPath(version);
        var actual = new MSBuildTools(version, toolsPath);

        expect(actual.path).toBeDefined();
        expect(actual.path).toBe(toolsPath);
        expect(actual.version).toBeDefined();
        expect(actual.version).toBe(version);
        expect(actual.buildProject).toBeDefined();
    });
});

describe('getAvailableUAPVersions method', function () {
    var availableVersions = ['10.0.10030.0', '10.0.10166.0', '10.0.10078.0'];
    var shellTest, shellLs;
    var programFilesx86Orig = process.env['ProgramFiles(x86)'];
    var programFilesOrig = process.env.ProgramFiles;

    beforeEach(function () {
        shellTest = spyOn(shell, 'test').and.returnValue(true);
        shellLs = spyOn(shell, 'ls').and.returnValue(availableVersions);
        process.env['ProgramFiles(x86)'] = '/';
        process.env.ProgramFiles = '/';
    });

    afterEach(function () {
        process.env['ProgramFiles(x86)'] = programFilesx86Orig;
        process.env.ProgramFiles = programFilesOrig;
    });

    it('should return list of available versions', function () {
        var versions = buildTools.getAvailableUAPVersions();
        expect(versions).toEqual(jasmine.any(Array));
        expect(versions.length).toEqual(3);
    });

    it('should return empty array if no UAP SDKs installed', function () {
        shellLs.and.returnValue([]);
        expect(buildTools.getAvailableUAPVersions().length).toEqual(0);
        shellTest.and.returnValue(false);
        expect(buildTools.getAvailableUAPVersions().length).toEqual(0);
    });

    it('should return empty array if it isn\'t able to detect SDK location', function () {
        delete process.env['ProgramFiles(x86)'];
        delete process.env.ProgramFiles;
        expect(buildTools.getAvailableUAPVersions().length).toEqual(0);
    });

    it('should return sorted list versions with only valid versions', function () {
        var brokenAvailableVersions = availableVersions.concat('Broken.version');
        shellLs.and.returnValue(brokenAvailableVersions);

        var versions = buildTools.getAvailableUAPVersions();
        expect(versions).toEqual(jasmine.any(Array));
        expect(versions.length).toEqual(3);

        versions.forEach(function (version) {
            expect(version).toEqual(jasmine.any(Version));
        });
    });
});

describe('getMSBuildToolsAt method', function () {
    var fakePath = '/some/fake/path';
    var messyPath = '/another/fake/path';
    var fakeVersion = '22.0.12635.5';
    var fakeVersionParsed = '22.0';

    var spawnOriginal = buildTools.__get__('spawn');
    var spawnSpy = jasmine.createSpy('spawn');

    beforeEach(function () {
        buildTools.__set__('spawn', spawnSpy);
    });

    afterEach(function () {
        buildTools.__set__('spawn', spawnOriginal);
    });

    it('should return MSBuildTools instance', function () {
        spawnSpy.and.returnValue(Promise.resolve(fakeVersion));

        return buildTools.getMSBuildToolsAt(fakePath)
            .then(function (tools) {
                expect(tools).toEqual(jasmine.any(MSBuildTools));
                expect(tools.version).toBe(fakeVersionParsed);
                expect(tools.path).toBe(fakePath);
            });
    });

    it('should reject promise if no msbuild found', function () {
        spawnSpy.and.returnValue(Promise.reject());

        return buildTools.getMSBuildToolsAt(messyPath).then(
            () => fail('Expected promise to be rejected'),
            () => expect().nothing()
        );
    });
});
