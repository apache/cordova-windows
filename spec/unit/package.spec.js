/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    'License'); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/
var path = require('path');
var rewire = require('rewire');
var shell = require('shelljs');
var platformRoot = '../../template';
var pkgRoot = './template/';
var pkgPath = path.join(pkgRoot, 'AppPackages');
var testPkgPath = './spec/unit/fixtures/DummyProject/AppPackages';
var pkg = rewire(platformRoot + '/cordova/lib/package.js');

var consoleLogOriginal;

beforeEach(function () {
    // console output suppression
    consoleLogOriginal = pkg.__get__('console.log');
    pkg.__set__('console.log', function () {});
});

afterEach(function () {
    pkg.__set__('console.log', consoleLogOriginal);
});

describe('getPackage method', function () {
    it('start', function () {
        shell.rm('-rf', pkgPath);
        shell.cp('-R', testPkgPath, pkgRoot);
    });

    it('spec.1 should find windows anycpu debug package', function () {
        return pkg.getPackage('windows', 'debug', 'anycpu')
            .then(function (pkgInfo) {
                expect(pkgInfo.type).toBe('windows');
                expect(pkgInfo.buildtype).toBe('debug');
                expect(pkgInfo.arch).toBe('anycpu');
                expect(pkgInfo.script).toBeDefined();
            });
    });

    it('spec.2 should find windows phone anycpu debug package', function () {
        return pkg.getPackage('phone', 'debug', 'anycpu')
            .then(function (pkgInfo) {
                expect(pkgInfo.type).toBe('phone');
                expect(pkgInfo.buildtype).toBe('debug');
                expect(pkgInfo.arch).toBe('anycpu');
                expect(pkgInfo.script).toBeDefined();
            });
    });

    it('spec.3 should not find windows 10 anycpu debug package', function () {
        return pkg.getPackage('windows10', 'debug', 'anycpu')
            .then(
                () => fail('Expected promise to be rejected'),
                () => expect().nothing()
            );
    });

    it('spec.4 should not find windows anycpu release package', function () {
        return pkg.getPackage('windows', 'release', 'anycpu')
            .then(
                () => fail('Expected promise to be rejected'),
                () => expect().nothing()
            );
    });

    it('spec.5 should not find windows x86 debug package', function () {
        return pkg.getPackage('windows', 'debug', 'x86')
            .then(
                () => fail('Expected promise to be rejected'),
                () => expect().nothing()
            );
    });

    it('end', function () {
        shell.rm('-rf', pkgPath);
    });
});

describe('getPackageFileInfo method', function () {
    it('spec.6 should get file info correctly for wp8 anycpu debug package', function () {
        var packageFile = path.join(pkgPath, 'CordovaApp.Phone_0.0.1.0_debug_Test', 'CordovaApp.Phone_0.0.1.0_AnyCPU_debug.appxbundle');
        var pkgInfo = pkg.getPackageFileInfo(packageFile);

        expect(pkgInfo.type).toBe('phone');
        expect(pkgInfo.arch).toBe('anycpu');
        expect(pkgInfo.buildtype).toBe('debug');
    });

    it('spec.7 should get file info correctly for windows 8.1 anycpu debug package', function () {
        var packageFile = path.join(pkgPath, 'CordovaApp.Windows_0.0.1.0_anycpu_debug_Test', 'CordovaApp.Windows_0.0.1.0_anycpu_debug.appx');
        var pkgInfo = pkg.getPackageFileInfo(packageFile);

        expect(pkgInfo.type).toBe('windows');
        expect(pkgInfo.arch).toBe('anycpu');
        expect(pkgInfo.buildtype).toBe('debug');
    });

    it('spec.8 should get file info correctly for windows 8.1 x64 release package', function () {
        var packageFile = path.join(pkgPath, 'CordovaApp.Windows_0.0.1.0_x64_Test', 'CordovaApp.Windows_0.0.1.0_x64.appx');
        var pkgInfo = pkg.getPackageFileInfo(packageFile);

        expect(pkgInfo.type).toBe('windows');
        expect(pkgInfo.arch).toBe('x64');
        expect(pkgInfo.buildtype).toBe('release');
    });

    it('spec.9 should get file info correctly for windows 8.1 x86 release package', function () {
        var packageFile = path.join(pkgPath, 'CordovaApp.Windows_0.0.1.0_x86_Test', 'CordovaApp.Windows_0.0.1.0_x86.appx');
        var pkgInfo = pkg.getPackageFileInfo(packageFile);

        expect(pkgInfo.type).toBe('windows');
        expect(pkgInfo.arch).toBe('x86');
        expect(pkgInfo.buildtype).toBe('release');
    });
});

describe('getAppId method', function () {
    it('spec.11 should properly get Application Id value from manifest', function () {
        expect(pkg.getAppId(pkgRoot)).toBe('$guid1$');
    });
});
