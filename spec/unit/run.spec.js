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

var path = require('path');
var rewire = require('rewire');
var platformRoot = '../../template';
var buildPath = path.join(platformRoot, 'cordova', 'build');
var run = rewire(platformRoot + '/cordova/lib/run.js');

var utils = require(path.join(platformRoot, 'cordova/lib/utils'));
var packages = require(path.join(platformRoot, 'cordova/lib/package'));

describe('run method', function () {
    var consoleLogOriginal;
    var isCordovaProjectOriginal;
    var buildRunOriginal;
    var getPackageOriginal;
    var deployToPhoneOriginal;
    var deployToDesktopOriginal;
    var ranWithElevatedPermissionsOriginal;

    var isCordovaProjectFalse = function () {
        return false;
    };

    var isCordovaProjectTrue = function () {
        return true;
    };

    beforeEach(function () {
        // console output suppression
        consoleLogOriginal = run.__get__('console.log');
        run.__set__('console.log', function () {});

        isCordovaProjectOriginal = run.__get__('utils.isCordovaProject');
        buildRunOriginal = run.__get__('build.run');
        getPackageOriginal = run.__get__('packages.getPackage');
        deployToPhoneOriginal = run.__get__('packages.deployToPhone');
        deployToDesktopOriginal = run.__get__('packages.deployToDesktop');
        ranWithElevatedPermissionsOriginal = run.__get__('ranWithElevatedPermissions');
        run.__set__('ranWithElevatedPermissions', function () { return false; });
    });

    afterEach(function () {
        run.__set__('console.log', consoleLogOriginal);
        run.__set__('utils.isCordovaProject', isCordovaProjectOriginal);
        run.__set__('build.run', buildRunOriginal);
        run.__set__('packages.getPackage', getPackageOriginal);
        run.__set__('packages.deployToPhone', deployToPhoneOriginal);
        run.__set__('packages.deployToDesktop', deployToDesktopOriginal);
        run.__set__('ranWithElevatedPermissions', ranWithElevatedPermissionsOriginal);
    });

    it('spec.1 should not run if not launched from project directory', function () {
        var buildRun = jasmine.createSpy();

        run.__set__('utils.isCordovaProject', isCordovaProjectFalse);
        run.__set__('build.run', function () {
            buildRun();
            return Promise.reject(); // rejecting to break run chain
        });

        return run.run(['node', buildPath]).then(
            () => fail('Expected promise to be rejected'),
            () => expect(buildRun).not.toHaveBeenCalled()
        );
    });

    it('spec.2 should not run if both debug and release args are specified', function () {
        var buildRun = jasmine.createSpy();

        run.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        run.__set__('build.run', function () {
            buildRun();
            return Promise.reject(); // rejecting to break run chain
        });

        return run.run({ release: true, debug: true }).then(
            () => fail('Expected promise to be rejected'),
            () => expect(buildRun).not.toHaveBeenCalled()
        );
    });

    it('spec.3 should not run if device and emulator args are combined', function () {
        var buildRun = jasmine.createSpy();

        run.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        run.__set__('build.run', function () {
            buildRun();
            return Promise.reject(); // rejecting to break run chain
        });

        return run.run({ device: true, emulator: true }).then(
            () => fail('Expected promise to be rejected'),
            () => expect(buildRun).not.toHaveBeenCalled()
        );
    });

    it('spec.4 should not run if device and target args are combined', function () {
        var buildRun = jasmine.createSpy();

        run.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        run.__set__('build.run', function () {
            buildRun();
            return Promise.reject(); // rejecting to break run chain
        });

        return run.run({ device: true, target: 'sometargethere' }).then(
            () => fail('Expected promise to be rejected'),
            () => expect(buildRun).not.toHaveBeenCalled()
        );
    });

    it('spec.5 should build and deploy on phone if --phone arg specified', function () {
        var build = jasmine.createSpy();
        var deployToPhone = jasmine.createSpy();
        var deployToDesktop = jasmine.createSpy();

        run.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        run.__set__('build.run', function () {
            build();
            var buildResult = {
                type: 'phone',
                arch: 'arm',
                archs: ['arm'],
                buildtype: 'release',
                appx: 'testfile',
                script: 'testfile.ps1',
                phoneId: 'undefined'
            };
            return Promise.resolve(buildResult);
        });
        run.__set__('packages.getPackage', function () {
            return Promise.resolve({
                type: 'phone',
                file: 'testfile'
            });
        });
        run.__set__('packages.deployToPhone', function () {
            deployToPhone();
            return Promise.resolve();
        });
        run.__set__('packages.deployToDesktop', function () {
            deployToDesktop();
            return Promise.resolve();
        });

        return run.run(['node', buildPath, '--phone', '--break'])
            .then(() => {
                expect(build).toHaveBeenCalled();
                expect(deployToPhone).toHaveBeenCalled();
                expect(deployToDesktop).not.toHaveBeenCalled();
            });
    });

    it('spec.6 should build and deploy on desktop if --phone arg is not specified', function () {
        var build = jasmine.createSpy();
        var deployToPhone = jasmine.createSpy();
        var deployToDesktop = jasmine.createSpy();

        run.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        run.__set__('build.run', function () {
            build();
            var buildResult = {
                type: 'windows',
                arch: 'anycpu',
                archs: ['anycpu'],
                buildtype: 'release',
                appx: 'testfile',
                script: 'testfile.ps1',
                phoneId: 'undefined'
            };
            return Promise.resolve(buildResult);
        });
        run.__set__('packages.getPackage', function () {
            return Promise.resolve({
                type: 'windows',
                file: 'testfile'
            });
        });
        run.__set__('packages.deployToPhone', function () {
            deployToPhone();
            return Promise.resolve();
        });
        run.__set__('packages.deployToDesktop', function () {
            deployToDesktop();
            return Promise.resolve();
        });

        return run.run(['node', buildPath])
            .finally(function () {
                expect(build).toHaveBeenCalled();
                expect(deployToDesktop).toHaveBeenCalled();
                expect(deployToPhone).not.toHaveBeenCalled();
            });
    });

    it('spec. 7 should not call build if --nobuild specified', function () {
        var build = jasmine.createSpy();
        var deployToDesktop = jasmine.createSpy();

        run.__set__('utils.isCordovaProject', isCordovaProjectTrue);
        run.__set__('build.run', function () {
            build();
            return Promise.reject(); // rejecting to break run chain
        });
        run.__set__('packages.getPackage', function () {
            return Promise.resolve({
                type: 'windows',
                file: 'testfile'
            });
        });
        run.__set__('packages.deployToDesktop', function () {
            deployToDesktop();
            return Promise.resolve();
        });

        return run.run({ nobuild: true })
            .finally(function () {
                expect(deployToDesktop).toHaveBeenCalled();
                expect(build).not.toHaveBeenCalled();
            });
    });

    it('spec.8 should accept --archs parameter either as cli or as platform arg', function () {
        spyOn(utils, 'isCordovaProject').and.returnValue(true);
        spyOn(packages, 'getPackage').and.returnValue(Promise.resolve({ arch: 'arm' }));
        spyOn(packages, 'deployToDesktop').and.returnValue(Promise.resolve());

        var anyString = jasmine.any(String);
        var expectedDeployOptions = jasmine.objectContaining({ arch: 'arm' });

        return run.run({ nobuild: true, argv: ['--archs=arm'] })
            .then(function () {
                expect(packages.getPackage).toHaveBeenCalledWith(anyString, anyString, 'arm');
                expect(packages.deployToDesktop).toHaveBeenCalledWith(expectedDeployOptions, anyString, anyString);
            })
            .then(function () {
                return run.run({ nobuild: true, archs: 'arm' });
            })
            .then(function () {
                expect(packages.getPackage).toHaveBeenCalledWith(anyString, anyString, 'arm');
                expect(packages.deployToDesktop).toHaveBeenCalledWith(expectedDeployOptions, anyString, anyString);
            });
    });

    it('spec.9 should fall back to anycpu if --archs parameter is not specified', function () {
        spyOn(utils, 'isCordovaProject').and.returnValue(true);
        spyOn(packages, 'getPackage').and.returnValue(Promise.resolve({ arch: 'anycpu' }));
        spyOn(packages, 'deployToDesktop').and.returnValue(Promise.resolve());

        var anyString = jasmine.any(String);
        var expectedDeployOptions = jasmine.objectContaining({ arch: 'anycpu' });

        return run.run({ nobuild: true })
            .then(function () {
                expect(packages.getPackage).toHaveBeenCalledWith(anyString, anyString, 'anycpu');
                expect(packages.deployToDesktop).toHaveBeenCalledWith(expectedDeployOptions, anyString, anyString);
            });
    });
});
