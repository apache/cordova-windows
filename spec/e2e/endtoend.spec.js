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
    var silent = true;

    function verifySubDirContainsFile (subDirName, fileName) {
        var subDir = path.join(appPackagesFolder, subDirName);
        var packages = shell.ls(subDir);
        expect(packages.filter(function (file) { return file.match(fileName); }).length).toBe(1);
    }

    beforeEach(function () {
        shell.exec(path.join('bin', 'create') + ' "' + projectFolder + '" com.test.app 応用', {silent: silent});
    });

    afterEach(function () {
        shell.cd(buildDirectory);
        shell.rm('-rf', projectFolder);
    });

    it('spec.1 should create new project', function () {
        expect(fs.existsSync(projectFolder)).toBe(true);
    });

    it('spec.2a should build default (win10) project', function () {
        shell.exec(buildScriptPath + '', {silent: silent});
        var packages = shell.ls(appPackagesFolder);
        var subDir = 'CordovaApp.Windows10_1.0.0.0_anycpu_debug_Test';
        expect(packages.filter(function (file) { return file.match(subDir); }).length).toBe(1);
        verifySubDirContainsFile(subDir, 'CordovaApp.Windows10_1.0.0.0_anycpu_debug.appx');
    });

    it('spec.2b should build 8.1 win project', function () {
        shell.exec(buildScriptPath + ' --appx=8.1-win', {silent: silent});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(/.*Windows.*\.appxupload/); }).length).toBe(1);
    });

    it('spec.2c should build 8.1 phone project', function () {
        shell.exec(buildScriptPath + ' --appx=8.1-phone', {silent: silent});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(/.*Phone.*\.appxupload*/); }).length).toBe(1);
    });

    it('spec.3 should build project for particular CPU', function () {
        shell.exec(buildScriptPath + ' --archs=\"x64\"', {silent: silent}); /* eslint no-useless-escape : 0 */
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(/.*Phone.*x64.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(/.*Windows.*x64.*\.appx.*/); }).length).toBe(1);
    });

    it('spec.4 should build project for CPUs separated by whitespaces', function () {
        shell.exec(buildScriptPath + ' --archs=\"x64 x86 arm anycpu\"', {silent: silent}); /* eslint no-useless-escape : 0 */
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(/.*Phone.*x86.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(/.*Phone.*x64.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(/.*Phone.*arm.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(/.*Phone.*AnyCPU.*\.appx.*/i); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(/.*Windows.*x64.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(/.*Windows.*x86.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(/.*Windows.*arm.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(/.*Windows.*anycpu.*\.appx.*/i); }).length).toBe(1);
    });

    it('spec.5 should build project containing plugin with InProcessServer extension', function (done) {
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
                var packages = shell.ls(appPackagesFolder);
                expect(packages.filter(function (file) { return file.match(/.*Phone.*\.appx.*/); }).length).toBe(1);
                expect(packages.filter(function (file) { return file.match(/.*Windows.*\.appx.*/); }).length).toBe(1);
            })
            .catch(fail)
            .finally(function () {
                expect(fail).not.toHaveBeenCalled();
                done();
            });
    });

    it('spec.6 should generate appxupload and appxbundle for Windows 8.1 project bundle release build', function () {
        shell.exec(buildScriptPath + ' --release --win --bundle --archs=\"x64 x86 arm\"', {silent: silent});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(/.*bundle\.appxupload$/); }).length > 0).toBeTruthy();

        var bundleDirName = 'CordovaApp.Windows_1.0.0.0_Test';
        expect(packages.filter(function (file) { return file.match(bundleDirName); }).length).toBe(1);

        verifySubDirContainsFile(bundleDirName, 'CordovaApp.Windows_1.0.0.0_x64_x86_arm.appxbundle');
    });

    it('spec.6.1 should generate appxupload for Windows 8.1 project non-bundle release build', function () {
        shell.exec(buildScriptPath + ' --release --win --archs=\"x64 x86 arm\"', {silent: silent});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(/.*\.appxupload$/); }).length).toBe(3);
    });

    it('spec.7 should generate appxupload and appxbundle for Windows 10 project bundle release build', function () {
        shell.exec(buildScriptPath + ' --release --win --appx=uap --bundle --archs=\"x64 x86 arm\"', {silent: silent});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(/.*bundle\.appxupload$/); }).length > 0).toBeTruthy();

        var bundleDirName = 'CordovaApp.Windows10_1.0.0.0_Test';
        expect(packages.filter(function (file) { return file.match(bundleDirName); }).length).toBe(1);

        verifySubDirContainsFile(bundleDirName, 'CordovaApp.Windows10_1.0.0.0_x64_x86_arm.appxbundle');
    });

    it('spec.7.1 should generate appxupload for Windows 10 project non-bundle release build', function () {
        shell.exec(buildScriptPath + ' --release --win --appx=uap --archs=\"x64 x86 arm\"', {silent: silent});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function (file) { return file.match(/.*\.appxupload$/); }).length).toBe(3);

        // CB-12416 Should build appx in separate dirs for each architecture
        var armSubDir = 'CordovaApp.Windows10_1.0.0.0_arm_Test';
        var x64SubDir = 'CordovaApp.Windows10_1.0.0.0_x64_Test';
        var x86SubDir = 'CordovaApp.Windows10_1.0.0.0_x86_Test';

        // Should contain a subdirectory for each of the architectures
        expect(packages.filter(function (file) { return file.match(armSubDir); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(x64SubDir); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(x86SubDir); }).length).toBe(1);

        // These subdirectories should contain corresponding appx files
        verifySubDirContainsFile(armSubDir, 'CordovaApp.Windows10_1.0.0.0_arm.appx');
        verifySubDirContainsFile(x64SubDir, 'CordovaApp.Windows10_1.0.0.0_x64.appx');
        verifySubDirContainsFile(x86SubDir, 'CordovaApp.Windows10_1.0.0.0_x86.appx');
    });

    it('spec.8 for a non-bundle case for Windows Phone 8.1 it should build appx in separate dirs for each architecture', function () {
        shell.exec(buildScriptPath + ' --release --phone --archs=\"x86 arm\"', {silent: silent});
        var packages = shell.ls(appPackagesFolder);

        var armSubDir = 'CordovaApp.Phone_1.0.0.0_arm_Test';
        var x86SubDir = 'CordovaApp.Phone_1.0.0.0_x86_Test';

        // Should contain a subdirectory for each of the architectures
        expect(packages.filter(function (file) { return file.match(armSubDir); }).length).toBe(1);
        expect(packages.filter(function (file) { return file.match(x86SubDir); }).length).toBe(1);

        // These subdirectories should contain corresponding appx files
        verifySubDirContainsFile(armSubDir, 'CordovaApp.Phone_1.0.0.0_arm.appx');
        verifySubDirContainsFile(x86SubDir, 'CordovaApp.Phone_1.0.0.0_x86.appx');
    });
});
