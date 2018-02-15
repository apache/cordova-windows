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
var fs = require('fs');
var path = require('path');

var FIXTURES = path.join(__dirname, '../unit/fixtures');
var EXTENSIONS_PLUGIN = 'org.test.plugins.extensionsplugin';
var extensionsPlugin = path.join(FIXTURES, EXTENSIONS_PLUGIN);

var templateFolder = path.join(__dirname, '../../template');
var Api = require(path.join(templateFolder, 'cordova/Api'));
var PluginInfo = require('cordova-common').PluginInfo;

describe('Cordova create and build', function () {

    var projectFolder = 'testcreate 応用';
    var buildDirectory = path.join(__dirname, '../..');
    var appPackagesFolder = path.join(buildDirectory, projectFolder, 'AppPackages');
    var buildScriptPath = '"' + path.join(buildDirectory, projectFolder, 'cordova', 'build') + '"';
    var prepareScriptPath = '"' + path.join(buildDirectory, projectFolder, 'cordova', 'prepare') + '"';

    var silent = false;

    function verifySubDirContainsFile (subDirName, fileName, count) {
        count = typeof count !== 'undefined' ? count : 1;

        var subDir = path.join(appPackagesFolder, subDirName);
        var packages = shell.ls(subDir);
        expect(packages.filter(function (file) { return file.match(fileName); }).length).toBe(count);
    }

    function _expectExist (fileNamePattern, count) {
        count = typeof count !== 'undefined' ? count : 1;

        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(fileNamePattern); }).length).toBe(count);
    }

    function _expectSubdirAndFileExist (subDirName, fileName, count) {
        count = typeof count !== 'undefined' ? count : 1;

        _expectExist(subDirName);
        verifySubDirContainsFile(subDirName, fileName, count);
    }

    beforeEach(function () {
        shell.exec(path.join('bin', 'create') + ' "' + projectFolder + '" com.test.app 応用', {silent: silent});
        shell.exec(prepareScriptPath + '', {silent: silent});
    });

    afterEach(function () {
        shell.cd(buildDirectory);
        shell.rm('-rf', projectFolder);
    });

    it('spec.1 should create new project', function () {
        expect(fs.existsSync(projectFolder)).toBe(true);
    });

    // default

    it('spec.2a should build default (win10) project', function () {
        shell.exec(buildScriptPath + '', {silent: silent});
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_anycpu_debug_Test', 'CordovaApp.Windows10_1.0.0.0_anycpu_debug.appx');
    });

    // --appx

    it('spec.2b should build uap (win10) project', function () {
        shell.exec(buildScriptPath + ' --appx=uap', {silent: silent});
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_anycpu_debug_Test', 'CordovaApp.Windows10_1.0.0.0_anycpu_debug.appx');
    });

    it('spec.2c should build uwp (win10) project', function () {
        shell.exec(buildScriptPath + ' --appx=uwp', {silent: silent});
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_anycpu_debug_Test', 'CordovaApp.Windows10_1.0.0.0_anycpu_debug.appx');
    });

    // --archs

    it('spec.3a should build project for particular CPU', function () {
        shell.exec(buildScriptPath + ' --archs=\"x64\"', {silent: silent}); /* eslint no-useless-escape : 0 */
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_x64_debug_Test', 'CordovaApp.Windows10_1.0.0.0_x64_debug.appx');
    });

    it('spec.4a should build project for CPUs separated by whitespaces', function () {
        shell.exec(buildScriptPath + ' --archs=\"x64 x86 arm anycpu\"', {silent: silent}); /* eslint no-useless-escape : 0 */
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_x64_debug_Test', 'CordovaApp.Windows10_1.0.0.0_x64_debug.appx');
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_x86_debug_Test', 'CordovaApp.Windows10_1.0.0.0_x86_debug.appx');
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_arm_debug_Test', 'CordovaApp.Windows10_1.0.0.0_arm_debug.appx');
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_anycpu_debug_Test', 'CordovaApp.Windows10_1.0.0.0_anycpu_debug.appx');
    });

    // "InProcessServer extension"

    it('spec.5a should build project containing plugin with InProcessServer extension', function (done) {
        var extensionsPluginInfo, api;

        extensionsPluginInfo = new PluginInfo(extensionsPlugin);
        api = new Api();
        api.root = projectFolder;
        api.locations.root = projectFolder;
        api.locations.www = path.join(projectFolder, 'www');

        var fail = jasmine.createSpy('fail')
            .and.callFake(function (err) {
                console.error(err);
            });

        api.addPlugin(extensionsPluginInfo)
            .then(function () {
                shell.exec(buildScriptPath, {silent: silent});
                _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_anycpu_debug_Test', 'CordovaApp.Windows10_1.0.0.0_anycpu_debug.appx');
            })
            .catch(fail)
            .finally(function () {
                expect(fail).not.toHaveBeenCalled();
                done();
            });
    });

    // --release --bundle

    // here be 6a

    // --release (non-bundle)

    it('spec.7 should generate appxupload for Windows 10 project non-bundle release build', function () {
        shell.exec(buildScriptPath + ' --release --archs=\"x64 x86 arm\"', {silent: silent});
        _expectExist(/.*\.appxupload$/, 3);
        // CB-12416 Should build appx in separate dirs for each architecture
        // Should contain a subdirectory for each of the architectures
        // These subdirectories should contain corresponding appx files
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_arm_Test', 'CordovaApp.Windows10_1.0.0.0_arm.appx');
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_x64_Test', 'CordovaApp.Windows10_1.0.0.0_x64.appx');
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_x86_Test', 'CordovaApp.Windows10_1.0.0.0_x86.appx');
    });

    // this will be move up again when it is fixed for VS 2017 on AppVeyor
    it('spec.6a should generate appxupload and appxbundle for Windows 10 project bundle release build', function () {
        shell.exec(buildScriptPath + ' --release --bundle --archs=\"x64 x86 arm\"', {silent: silent});
        _expectExist(/.*bundle\.appxupload$/, 3);
        _expectSubdirAndFileExist('CordovaApp.Windows10_1.0.0.0_Test', 'CordovaApp.Windows10_1.0.0.0_x64_x86_arm.appxbundle');
    });
});
