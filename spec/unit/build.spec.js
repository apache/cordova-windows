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
    path = require('path'),
    rewire = require('rewire'),
    platformRoot = '../../template',
    testPath = 'testpath',
    buildPath = path.join(platformRoot, 'cordova', 'build'),
    prepare = require(platformRoot + '/cordova/lib/prepare.js'),
    build = rewire(platformRoot + '/cordova/lib/build.js');

function createFindAvailableVersionMock(version, path, buildSpy) {
    build.__set__('MSBuildTools.findAvailableVersion', function() {
        return Q.resolve({
            version: version,
            path: path,
            buildProject: function (solutionFile, buildType, buildArch) {
                if (typeof buildSpy === 'function') {
                    buildSpy(solutionFile, buildType, buildArch);
                }
                return Q.reject(); // rejecting here to stop build process
            }
        });
    });
}

function createFindAllAvailableVersionsMock(versionSet) {
    build.__set__('MSBuildTools.findAllAvailableVersions', function() {
        return Q.resolve(versionSet);
    });
}

function createConfigParserMock(winVersion, phoneVersion) {
    build.__set__('ConfigParser', function() {
        return {
            getPreference: function(prefName) {
                switch (prefName) {
                    case 'windows-target-version':
                        return winVersion;
                    case 'windows-phone-target-version':
                        return phoneVersion;
                }
            },
            getWindowsTargetVersion: function() {
                return winVersion;
            },
            getWindowsPhoneTargetVersion: function() {
                return phoneVersion;
            }
        };
    });
}

describe('run method', function() {
    var consoleLogOriginal,
        isCordovaProjectOriginal,
        findAvailableVersionOriginal,
        applyPlatformConfigOriginal,
        configParserOriginal;

    var isCordovaProjectFalse = function () {
        return false;
    };

    var isCordovaProjectTrue = function () {
        return true;
    };

    beforeEach(function () {
        // console output suppression
        consoleLogOriginal = build.__get__('console.log');
        build.__set__('console.log', function () {} );

        isCordovaProjectOriginal = build.__get__('utils.isCordovaProject');
        findAvailableVersionOriginal = build.__get__('MSBuildTools.findAvailableVersion');
        applyPlatformConfigOriginal = build.__get__('prepare.applyPlatformConfig');
        configParserOriginal = build.__get__('ConfigParser');

        var originalBuildMethod = build.run;
        spyOn(build, 'run').andCallFake(function () {
            // Bind original build to custom 'this' object to mock platform's locations property
            return originalBuildMethod.apply({locations: {www: 'some/path'}}, arguments);
        });

        spyOn(prepare, 'addBOMSignature');
    });

    afterEach(function() {
        build.__set__('console.log', consoleLogOriginal);
        build.__set__('utils.isCordovaProject', isCordovaProjectOriginal);
        build.__set__('MSBuildTools.findAvailableVersion', findAvailableVersionOriginal);
        build.__set__('prepare.applyPlatformConfig', applyPlatformConfigOriginal);
        build.__set__('ConfigParser', configParserOriginal);
    });

    it('spec.1 should reject if not launched from project directory', function(done) {
        var rejectSpy = jasmine.createSpy(),
            buildSpy = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectFalse);
        createFindAllAvailableVersionsMock([{version: '14.0', buildProject: buildSpy, path: testPath }]);

        build.run([ 'node', buildPath, '--release', '--debug' ])
        .fail(rejectSpy)
        .finally(function() {
            expect(rejectSpy).toHaveBeenCalled();
            expect(buildSpy).not.toHaveBeenCalled();
            done();
        });
    });

    it('spec.2 should reject if both debug and release args specified', function(done) {
        var rejectSpy = jasmine.createSpy(),
            buildSpy = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAvailableVersionMock('14.0', testPath, buildSpy);

        build.run([ 'node', buildPath, '--release', '--debug' ])
        .fail(rejectSpy)
        .finally(function() {
            expect(buildSpy).not.toHaveBeenCalled();
            expect(rejectSpy).toHaveBeenCalled();
            done();
        });
    });

    it('spec.3 should reject if both phone and win args specified', function(done) {
        var rejectSpy = jasmine.createSpy(),
            buildSpy = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAvailableVersionMock('14.0', testPath, buildSpy);

        build.run([ 'node', buildPath, '--phone', '--win' ])
        .fail(rejectSpy)
        .finally(function() {
            expect(buildSpy).not.toHaveBeenCalled();
            expect(rejectSpy).toHaveBeenCalled();
            done();
        });
    });

    it('spec.4 should call buildProject of MSBuildTools with buildType = "release" if called with --release argument', function(done) {
        var buildSpy = jasmine.createSpy().andCallFake(function (solutionFile, buildType, buildArch) {
            expect(buildType).toBe('release');
        });

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAllAvailableVersionsMock([{version: '14.0', buildProject: buildSpy, path: testPath }]);
        build.__set__('prepare.applyPlatformConfig', function() {} );

        build.run({ release: true })
        .finally(function() {
            expect(buildSpy).toHaveBeenCalled();
            done();
        });
    });

    it('spec.5 should call buildProject of MSBuildTools with buildType = "debug" if called without arguments', function(done) {
        var buildSpy = jasmine.createSpy().andCallFake(function (solutionFile, buildType, buildArch) {
            expect(buildType).toBe('debug');
        });

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAllAvailableVersionsMock([{version: '14.0', buildProject: buildSpy, path: testPath }]);
        build.__set__('prepare.applyPlatformConfig', function() {} );

        build.run([ 'node', buildPath ])
        .finally(function() {
            expect(buildSpy).toHaveBeenCalled();
            done();
        });
    });

    it('spec.6 should call buildProject of MSBuildTools with buildArch = "arm" if called with --archs="arm" argument', function(done) {
        var buildSpy = jasmine.createSpy().andCallFake(function (solutionFile, buildType, buildArch) {
            expect(buildArch).toBe('arm');
        });

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAllAvailableVersionsMock([{version: '14.0', buildProject: buildSpy, path: testPath }]);
        build.__set__('prepare.applyPlatformConfig', function() {} );

        build.run({argv: ['--archs=arm'] })
        .finally(function() {
            expect(buildSpy).toHaveBeenCalled();
            done();
        });
    });

    it('spec.7 should call buildProject of MSBuildTools once for all architectures if called with --archs="arm x86 x64 anycpu" argument', function(done) {
        var armBuild = jasmine.createSpy(),
            x86Build = jasmine.createSpy(),
            x64Build = jasmine.createSpy(),
            anyCpuBuild = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAllAvailableVersionsMock([
            {
                version: '14.0',
                path: testPath,
                buildProject: function(solutionFile, buildType, buildArch) {
                    expect(buildArch).toMatch(/^arm$|^any\s?cpu$|^x86$|^x64$/);
                    switch (buildArch) {
                        case 'arm':
                            armBuild();
                            return Q();
                        case 'x86':
                            x86Build();
                            return Q();
                        case 'anycpu':
                        case 'any cpu':
                            anyCpuBuild();
                            return Q();
                        case 'x64':
                            x64Build();
                            return Q();
                        default:
                            return Q.reject();
                    }
                }
             }]);
        build.__set__('prepare.applyPlatformConfig', function() {} );

        build.run({ argv: ['--archs=arm x86 x64 anycpu', '--phone'] })
        .finally(function() {
            expect(armBuild).toHaveBeenCalled();
            expect(x86Build).toHaveBeenCalled();
            expect(x64Build).toHaveBeenCalled();
            expect(anyCpuBuild).toHaveBeenCalled();
            done();
        });
    });

    it('spec.8 should call buildProject of MSBuildTools if built with MSBuildTools version 4.0', function(done) {
        var buildSpy = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAllAvailableVersionsMock([{version: '4.0', buildProject: buildSpy, path: testPath }]);
        build.__set__('prepare.applyPlatformConfig', function() {} );
        createConfigParserMock('8.0');

        build.run({argv: ['--win']})
        .finally(function() {
            expect(buildSpy).toHaveBeenCalled();
            done();
        });
    });

    it('spec.9 should call buildProject of MSBuildTools if built for windows 8.1', function(done) {
        var buildSpy = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAllAvailableVersionsMock([{version: '14.0', buildProject: buildSpy, path: testPath }]);
        build.__set__('prepare.applyPlatformConfig', function() {} );
        createConfigParserMock('8.1');

        build.run({argv: ['--win']})
        .finally(function() {
            expect(buildSpy).toHaveBeenCalled();
            done();
        });
    });

    it('spec.10 should throw an error if windows-target-version has unsupported value', function(done) {
        var buildSpy = jasmine.createSpy(),
            errorSpy = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAvailableVersionMock('14.0', testPath, buildSpy);
        build.__set__('prepare.applyPlatformConfig', function() {} );
        createConfigParserMock('unsupported value here');

        build.run({argv: ['--win']})
        .fail(function(error) {
            errorSpy();
            expect(error).toBeDefined();
        })
        .finally(function() {
            expect(errorSpy).toHaveBeenCalled();
            expect(buildSpy).not.toHaveBeenCalled();
            done();
        });
    });

    it('spec.11 should call buildProject of MSBuildTools if built for windows phone 8.1', function(done) {
        var buildSpy = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAllAvailableVersionsMock([{version: '14.0', buildProject: buildSpy, path: testPath }]);
        build.__set__('prepare.applyPlatformConfig', function() {} );
        createConfigParserMock(null, '8.1');

        build.run({argv: ['--phone']})
        .finally(function() {
            expect(buildSpy).toHaveBeenCalled();
            done();
        });
    });

    it('spec.12 should throw an error if windows-phone-target-version has unsupported value', function(done) {
        var buildSpy = jasmine.createSpy(),
            errorSpy = jasmine.createSpy();

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAvailableVersionMock('14.0', testPath, buildSpy);
        build.__set__('prepare.applyPlatformConfig', function() {} );
        createConfigParserMock(null, 'unsupported value here');

        build.run({argv: ['--phone']})
        .fail(function(error) {
            errorSpy();
            expect(error).toBeDefined();
        })
        .finally(function() {
            expect(errorSpy).toHaveBeenCalled();
            expect(buildSpy).not.toHaveBeenCalled();
            done();
        });
    });

    it('spec.13 should be able to override target via --appx parameter', function(done) {
        var buildSpy = jasmine.createSpy().andCallFake(function(solutionFile, buildType, buildArch) {
                // check that we build Windows 10 and not Windows 8.1
                expect(solutionFile.toLowerCase().indexOf('cordovaapp.windows10.jsproj') >=0).toBe(true);
            });

        build.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        createFindAllAvailableVersionsMock([{version: '14.0', buildProject: buildSpy, path: testPath }]);
        build.__set__('prepare.applyPlatformConfig', function() {} );
        // provision config to target Windows 8.1
        createConfigParserMock('8.1', '8.1');
        // explicitly specify Windows 10 as target
        build.run({argv: ['--appx=uap']})
        .finally(function() {
            expect(buildSpy).toHaveBeenCalled();
            done();
        });
    });
});
