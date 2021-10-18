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
var fs = require('fs');
var path = require('path');
var rewire = require('rewire');
var platformRoot = '../../template';
var testPath = 'testpath';
var buildPath = path.join(platformRoot, 'cordova', 'build');
var prepare = require(platformRoot + '/cordova/lib/prepare.js');
var build = rewire(platformRoot + '/cordova/lib/build.js');

var utils = require(platformRoot + '/cordova/lib/utils');
var pkg = require(platformRoot + '/cordova/lib/package');
var AppxManifest = require(platformRoot + '/cordova/lib/AppxManifest');
var MSBuildTools = require(platformRoot + '/cordova/lib/MSBuildTools');

function createFindAvailableVersionMock (version, path, buildSpy) {
    build.__set__('MSBuildTools.findAvailableVersion', function () {
        return Promise.resolve({
            version: version,
            path: path,
            buildProject: function (solutionFile, buildType, buildArch) {
                if (typeof buildSpy === 'function') {
                    buildSpy(solutionFile, buildType, buildArch);
                }
                return Promise.reject(); // rejecting here to stop build process
            }
        });
    });
}

function createFindAllAvailableVersionsMock (versionSet) {
    build.__set__('MSBuildTools.findAllAvailableVersions', function () {
        return Promise.resolve(versionSet);
    });
}

function createConfigParserMock (winVersion, phoneVersion) {
    build.__set__('ConfigParser', function () {
        return {
            getPreference: function (prefName) {
                switch (prefName) {
                case 'windows-target-version':
                    return winVersion;
                case 'windows-phone-target-version':
                    return phoneVersion;
                }
            },
            getWindowsTargetVersion: function () {
                return winVersion;
            },
            getWindowsPhoneTargetVersion: function () {
                return phoneVersion;
            }
        };
    });
}

describe('run method', function () {
    var findAvailableVersionOriginal,
        findAllAvailableVersionsOriginal,
        configParserOriginal;

    beforeEach(function () {
        findAvailableVersionOriginal = build.__get__('MSBuildTools.findAvailableVersion');
        findAllAvailableVersionsOriginal = build.__get__('MSBuildTools.findAllAvailableVersions');
        configParserOriginal = build.__get__('ConfigParser');

        var originalBuildMethod = build.run;
        spyOn(build, 'run').and.callFake(function () {
            // Bind original build to custom 'this' object to mock platform's locations property
            return originalBuildMethod.apply({ locations: { www: 'some/path' } }, arguments);
        });

        spyOn(utils, 'isCordovaProject').and.returnValue(true);
        spyOn(prepare, 'applyPlatformConfig');
        spyOn(prepare, 'updateBuildConfig');
        spyOn(pkg, 'getPackage').and.returnValue(Promise.resolve({}));

        spyOn(AppxManifest, 'get').and.returnValue({
            getIdentity: function () {
                return { setPublisher: function () {} };
            },
            write: function () {}
        });
    });

    afterEach(function () {
        build.__set__('MSBuildTools.findAvailableVersion', findAvailableVersionOriginal);
        build.__set__('MSBuildTools.findAllAvailableVersions', findAllAvailableVersionsOriginal);
        build.__set__('ConfigParser', configParserOriginal);
    });

    it('spec.1 should reject if not launched from project directory', function () {
        var buildSpy = jasmine.createSpy();

        // utils.isCordovaProject is a spy, so we can call andReturn directly on it
        utils.isCordovaProject.and.returnValue(false);
        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: buildSpy, path: testPath }]);

        return build.run(['node', buildPath, '--release', '--debug']).then(
            () => fail('Expected promise to be rejected'),
            () => expect(buildSpy).not.toHaveBeenCalled()
        );
    });

    it('spec.2 should throw if both debug and release args specified', function () {
        var buildSpy = jasmine.createSpy();

        createFindAvailableVersionMock('14.0', testPath, buildSpy);

        expect(function () {
            build.run({ release: true, debug: true });
        }).toThrow();
    });

    it('spec.3 should throw if both phone and win args specified', function () {
        var buildSpy = jasmine.createSpy();

        createFindAvailableVersionMock('14.0', testPath, buildSpy);

        expect(function () {
            build.run({ argv: ['--phone', '--win'] });
        }).toThrow();
    });

    it('should respect build configuration from \'buildConfig\' option', function () {
        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: jasmine.createSpy(), path: testPath }]);
        var buildConfigPath = path.resolve(__dirname, 'fixtures/fakeBuildConfig.json');

        return build.run({ buildConfig: buildConfigPath })
            .finally(function () {
                expect(prepare.updateBuildConfig).toHaveBeenCalled();
                var buildOpts = prepare.updateBuildConfig.calls.argsFor(0)[0];
                var buildConfig = require(buildConfigPath).windows.debug;
                expect(buildOpts.packageCertificateKeyFile).toBeDefined();
                expect(buildOpts.packageCertificateKeyFile)
                    .toEqual(path.resolve(path.dirname(buildConfigPath), buildConfig.packageCertificateKeyFile));

                ['packageThumbprint', 'publisherId'].forEach(function (key) {
                    expect(buildOpts[key]).toBeDefined();
                    expect(buildOpts[key]).toEqual(buildConfig[key]);
                });
            });
    }, 20000);

    it('spec.4 should call buildProject of MSBuildTools with buildType = "release" if called with --release argument', function () {
        var buildSpy = jasmine.createSpy().and.callFake(function (solutionFile, buildType, buildArch) {
            expect(buildType).toBe('release');
        });

        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: buildSpy, path: testPath }]);

        return build.run({ release: true })
            .finally(function () {
                expect(buildSpy).toHaveBeenCalled();
            });
    });

    it('spec.5 should call buildProject of MSBuildTools with buildType = "debug" if called without arguments', function () {
        var buildSpy = jasmine.createSpy().and.callFake(function (solutionFile, buildType, buildArch) {
            expect(buildType).toBe('debug');
        });

        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: buildSpy, path: testPath }]);

        return build.run(['node', buildPath])
            .finally(function () {
                expect(buildSpy).toHaveBeenCalled();
            });
    });

    it('spec.6 should call buildProject of MSBuildTools with buildArch = "arm" if called with --archs="arm" argument', function () {
        var buildSpy = jasmine.createSpy().and.callFake(function (solutionFile, buildType, buildArch) {
            expect(buildArch).toBe('arm');
        });

        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: buildSpy, path: testPath }]);

        return build.run({ archs: 'arm' })
            .finally(function () {
                expect(buildSpy).toHaveBeenCalled();
            });
    });

    it('spec.7 should call buildProject of MSBuildTools once for all architectures if called with --archs="arm x86 x64 anycpu" argument', function () {
        var armBuild = jasmine.createSpy();
        var x86Build = jasmine.createSpy();
        var x64Build = jasmine.createSpy();
        var anyCpuBuild = jasmine.createSpy();

        createFindAllAvailableVersionsMock([
            {
                version: '14.0',
                path: testPath,
                buildProject: function (solutionFile, buildType, buildArch) {
                    expect(buildArch).toMatch(/^arm$|^any\s?cpu$|^x86$|^x64$/);
                    switch (buildArch) {
                    case 'arm':
                        armBuild();
                        return Promise.resolve();
                    case 'x86':
                        x86Build();
                        return Promise.resolve();
                    case 'anycpu':
                    case 'any cpu':
                        anyCpuBuild();
                        return Promise.resolve();
                    case 'x64':
                        x64Build();
                        return Promise.resolve();
                    default:
                        return Promise.reject();
                    }
                }
            }]);

        return build.run({ archs: 'arm x86 x64 anycpu', argv: ['--phone'] })
            .finally(function () {
                expect(armBuild).toHaveBeenCalled();
                expect(x86Build).toHaveBeenCalled();
                expect(x64Build).toHaveBeenCalled();
                expect(anyCpuBuild).toHaveBeenCalled();
            });
    });

    xit('spec.8 should fail buildProject if built with MSBuildTools version 4.0', function () {
        var buildSpy = jasmine.createSpy();

        createFindAllAvailableVersionsMock([{ version: '4.0', buildProject: buildSpy, path: testPath }]);
        createConfigParserMock('8.0');

        return build.run({ argv: ['--win'] }).then(
            () => fail('Expected promise to be rejected'),
            error => {
                expect(error).toBeDefined();
                expect(buildSpy).not.toHaveBeenCalled();
            }
        );
    });

    it('spec.9 should call buildProject of MSBuildTools if built for windows 8.1', function () {
        var buildSpy = jasmine.createSpy();

        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: buildSpy, path: testPath }]);
        createConfigParserMock('8.1');

        return build.run({ argv: ['--win'] })
            .finally(function () {
                expect(buildSpy).toHaveBeenCalled();
            });
    });

    xit('spec.10 should throw an error if windows-target-version has unsupported value', function () {
        var buildSpy = jasmine.createSpy();

        createFindAvailableVersionMock('14.0', testPath, buildSpy);
        createConfigParserMock('unsupported value here');

        return build.run({ argv: ['--win'] }).then(
            () => fail('Expected promise to be rejected'),
            error => {
                expect(error).toBeDefined();
                expect(buildSpy).not.toHaveBeenCalled();
            }
        );
    });

    it('spec.11 should call buildProject of MSBuildTools if built for windows phone 8.1', function () {
        var buildSpy = jasmine.createSpy();

        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: buildSpy, path: testPath }]);
        createConfigParserMock(null, '8.1');

        return build.run({ argv: ['--phone'] })
            .finally(function () {
                expect(buildSpy).toHaveBeenCalled();
            });
    });

    xit('spec.12 should throw an error if windows-phone-target-version has unsupported value', function () {
        var buildSpy = jasmine.createSpy();

        createFindAvailableVersionMock('14.0', testPath, buildSpy);
        createConfigParserMock(null, 'unsupported value here');

        return build.run({ argv: ['--phone'] }).then(
            () => fail('Expected promise to be rejected'),
            error => {
                expect(error).toBeDefined();
                expect(buildSpy).not.toHaveBeenCalled();
            }
        );
    });

    it('spec.13a should be able to override target via --appx parameter', function () {
        var buildSpy = jasmine.createSpy().and.callFake(function (solutionFile, buildType, buildArch) {
            // check that we build Windows 10 and not Windows 8.1
            expect(solutionFile.toLowerCase()).toMatch('cordovaapp.windows10.jsproj');
        });

        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: buildSpy, path: testPath }]);
        // provision config to target Windows 8.1
        createConfigParserMock('8.1', '8.1');
        // explicitly specify Windows 10 as target
        return build.run({ argv: ['--appx=uap'] })
            .finally(function () {
                expect(buildSpy).toHaveBeenCalled();
            });
    });

    it('spec.13b should be able to override target via --appx parameter', function () {
        var buildSpy = jasmine.createSpy().and.callFake(function (solutionFile, buildType, buildArch) {
            // check that we build Windows 10 and not Windows 8.1
            expect(solutionFile.toLowerCase()).toMatch('cordovaapp.windows10.jsproj');
        });

        createFindAllAvailableVersionsMock([{ version: '14.0', buildProject: buildSpy, path: testPath }]);
        // provision config to target Windows 8.1
        createConfigParserMock('8.1', '8.1');
        // explicitly specify Windows 10 as target
        return build.run({ argv: ['--appx=uwp'] })
            .finally(function () {
                expect(buildSpy).toHaveBeenCalled();
            });
    });

    it('spec.14a should use user-specified msbuild if VSINSTALLDIR variable is set', function () {
        var customMSBuildPath = '/some/path';
        var msBuildBinPath = path.join(customMSBuildPath, 'MSBuild/15.0/Bin');
        var customMSBuildVersion = '15.0';
        process.env.VSINSTALLDIR = customMSBuildPath;
        // avoid crosspollution with MSBUILDDIR
        var backupMSBUILDDIR = process.env.MSBUILDDIR;
        delete process.env.MSBUILDDIR;

        spyOn(MSBuildTools, 'getMSBuildToolsAt')
            .and.returnValue(Promise.resolve({
                path: customMSBuildPath,
                version: customMSBuildVersion,
                buildProject: jasmine.createSpy('buildProject').and.returnValue(Promise.resolve())
            }));

        return build.run({})
            .then(() => {
                expect(MSBuildTools.getMSBuildToolsAt).toHaveBeenCalledWith(msBuildBinPath);
            })
            .finally(function () {
                delete process.env.VSINSTALLDIR;
                process.env.MSBUILDDIR = backupMSBUILDDIR;
            });
    });

    it('spec.14b should use user-specified msbuild if MSBUILDDIR variable is set', function () {
        var msBuildBinPath = path.join('/some/path', 'MSBuild/15.0/Bin');
        var customMSBuildVersion = '15.0';
        process.env.MSBUILDDIR = msBuildBinPath;
        // avoid crosspollution with VSINSTALLDIR
        var backupVSINSTALLDIR = process.env.VSINSTALLDIR;
        delete process.env.VSINSTALLDIR;

        spyOn(MSBuildTools, 'getMSBuildToolsAt')
            .and.returnValue(Promise.resolve({
                path: msBuildBinPath,
                version: customMSBuildVersion,
                buildProject: jasmine.createSpy('buildProject').and.returnValue(Promise.resolve())
            }));

        return build.run({})
            .then(() => {
                expect(MSBuildTools.getMSBuildToolsAt).toHaveBeenCalledWith(msBuildBinPath);
            })
            .finally(function () {
                delete process.env.MSBUILDDIR;
                process.env.VSINSTALLDIR = backupVSINSTALLDIR;
            });
    });

    it('spec.15a should choose latest version if there are multiple versions available with minor version difference', function () {
        var buildTools14 = { version: '14.0', buildProject: jasmine.createSpy('buildTools14'), path: testPath };
        var buildTools15 = { version: '15.0', buildProject: jasmine.createSpy('buildTools15'), path: testPath };
        var buildTools151 = { version: '15.1', buildProject: jasmine.createSpy('buildTools151'), path: testPath };

        createFindAllAvailableVersionsMock([buildTools14, buildTools15, buildTools151]);
        // explicitly specify Windows 10 as target
        return build.run({ argv: ['--appx=uap'] })
            .then(() => {
                expect(buildTools151.buildProject).toHaveBeenCalled();
            });
    });

    it('spec.15b should choose latest version if there are multiple versions available with minor version difference', function () {
        var buildTools14 = { version: '14.0', buildProject: jasmine.createSpy('buildTools14'), path: testPath };
        var buildTools15 = { version: '15.0', buildProject: jasmine.createSpy('buildTools15'), path: testPath };
        var buildTools151 = { version: '15.1', buildProject: jasmine.createSpy('buildTools151'), path: testPath };

        createFindAllAvailableVersionsMock([buildTools14, buildTools15, buildTools151]);
        // explicitly specify Windows 10 as target
        return build.run({ argv: ['--appx=uap'] })
            .then(() => {
                expect(buildTools151.buildProject).toHaveBeenCalled();
            });
    });
});

describe('buildFlags', function () {
    describe('parseAndValidateArgs method', function () {
        var parseAndValidateArgs;
        var readFileSync;

        beforeEach(function () {
            parseAndValidateArgs = build.__get__('parseAndValidateArgs');
            readFileSync = spyOn(fs, 'readFileSync');
        });

        it('should handle build flags from both CLI and buildConfig.json', function () {
            readFileSync.and.returnValue(JSON.stringify({
                windows: { debug: { buildFlag: 'baz="quux"' } }
            }));

            var buildOptions = {
                argv: ['--buildFlag', 'foo=bar', '--buildFlag', 'bar=baz', '--buildConfig', 'buildConfig.json']
            };

            expect(parseAndValidateArgs(buildOptions).buildFlags).toEqual(['baz="quux"', 'foo=bar', 'bar=baz']);
        });
    });

    describe('build', function () {
        beforeEach(function () {
            spyOn(utils, 'isCordovaProject').and.returnValue(true);
            spyOn(prepare, 'applyPlatformConfig');
            spyOn(prepare, 'updateBuildConfig');
            spyOn(pkg, 'getPackage').and.returnValue(Promise.resolve({}));

            spyOn(AppxManifest, 'get').and.returnValue({
                getIdentity: function () {
                    return { setPublisher: function () {} };
                },
                write: function () {}
            });
        });

        it('should pass buildFlags directly to MSBuild', function () {
            var buildTools = { version: '14.0', buildProject: jasmine.createSpy('buildProject').and.returnValue(Promise.resolve()), path: testPath };
            var buildOptions = {
                argv: ['--buildFlag', 'foo=bar']
            };

            createFindAllAvailableVersionsMock([buildTools]);

            return build.run(buildOptions)
                .then(() => {
                    // CB-12416 AppxBundle=Never is present because we are not building a bundle
                    expect(buildTools.buildProject).toHaveBeenCalledWith(jasmine.any(String),
                        jasmine.any(String), jasmine.any(String), ['foo=bar', '/p:AppxBundle=Never']);
                });
        });
    });
});
