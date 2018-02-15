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

var rewire = require('rewire');
var deployment = rewire('../../template/cordova/lib/deployment');
var Q = require('q');
var path = require('path');
var AppDeployCmdTool = deployment.__get__('AppDeployCmdTool');
var WinAppDeployCmdTool = deployment.__get__('WinAppDeployCmdTool');

var TEST_APP_PACKAGE_NAME = '"c:\\testapppackage.appx"';
var TEST_APP_PACKAGE_ID = '12121212-3434-3434-3434-567856785678';

describe('The correct version of the app deployment tool is obtained.', function () {

    var mockedProgramFiles = process.env['ProgramFiles(x86)'];

    beforeEach(function () {
        process.env['ProgramFiles(x86)'] = path.join('c:/Program Files (x86)');
    });

    afterEach(function () {
        if (mockedProgramFiles) {
            process.env['ProgramFiles(x86)'] = mockedProgramFiles;
        } else {
            delete process.env['ProgramFiles(x86)'];
        }
    });

    it('Test #001 : Provides a WinAppDeployCmdTool when 10.0 is requested.', function () {

        var tool = deployment.getDeploymentTool('10.0');
        expect(tool instanceof WinAppDeployCmdTool).toBe(true);

    });
});

describe('Windows 10 deployment interacts with the file system as expected.', function () {

    function fakeSpawn (cmd, args, cwd) {
        expect(cmd).toBe(path.join('c:/Program Files (x86)/Windows Kits/10/bin/x86/WinAppDeployCmd.exe'));
        switch (args[0]) {
        case 'devices':
            var output = 'Windows App Deployment Tool\r\nVersion 10.0.0.0\r\nCopyright (c) Microsoft Corporation. All rights reserved.\r\n\r\nDiscovering devices...\r\nIP Address      GUID                                    Model/Name\r\n127.0.0.1   00000015-b21e-0da9-0000-000000000000    Lumia 1520 (RM-940)\r\n10.120.70.172   00000000-0000-0000-0000-00155d619532    00155D619532\r\n10.120.68.150   00000000-0000-0000-0000-00155d011765    00155D011765\r\nDone.';
            return Q(output);

        case 'update':
        case 'install':
            expect(args[2]).toBe(TEST_APP_PACKAGE_NAME);
            expect(args[4]).toBe('127.0.0.1');
            return Q('');

        case 'uninstall':
            expect(args[2]).toBe(TEST_APP_PACKAGE_ID);
            expect(args[4]).toBe('10.120.68.150');
            return Q('');

        }
    }

    var mockedSpawn = deployment.__get__('spawn');
    var mockedProgramFiles = process.env['ProgramFiles(x86)'];

    beforeEach(function () {
        deployment.__set__('spawn', fakeSpawn);
        process.env['ProgramFiles(x86)'] = path.join('c:/Program Files (x86)');
    });

    afterEach(function () {
        deployment.__set__('spawn', mockedSpawn);
        if (mockedProgramFiles) {
            process.env['ProgramFiles(x86)'] = mockedProgramFiles;
        } else {
            delete process.env['ProgramFiles(x86)'];
        }
    });

    it('Test #002 : enumerateDevices returns a valid set of objects', function (done) {
        var deploymentTool = deployment.getDeploymentTool('10.0');
        deploymentTool.enumerateDevices()
            .then(function (deviceList) {
                expect(deviceList.length).toBe(3);
                expect(deviceList[0].name).toBe('Lumia 1520 (RM-940)');
                expect(deviceList[0].index).toBe(0);
                expect(deviceList[0].type).toBe('device');
                done();
            }).fail(function err (errMsg) {
                expect(errMsg).toBeUndefined();
                done();
            });
    });

    it('Test #003 : installAppPackage passes the correct set of parameters', function (done) {
        var deploymentTool = deployment.getDeploymentTool('10.0');
        deploymentTool.enumerateDevices()
            .then(function (deviceList) {
                deploymentTool.installAppPackage(TEST_APP_PACKAGE_NAME, deviceList[0], /* shouldLaunch */ false, /* shouldUpdate */ false);
                done();
            }).fail(function err (errMsg) {
                expect(errMsg).toBeUndefined();
                done();
            });
    });

    it('Test #004 : installAppPackage passes the correct set of parameters when updating', function (done) {
        var deploymentTool = deployment.getDeploymentTool('10.0');
        deploymentTool.enumerateDevices()
            .then(function (deviceList) {
                deploymentTool.installAppPackage(TEST_APP_PACKAGE_NAME, deviceList[0], /* shouldLaunch */ false, /* shouldUpdate */ true);
                done();
            }).fail(function err (errMsg) {
                expect(errMsg).toBeUndefined();
                done();
            });
    });

    it('Test #005 : uninstallAppPackage passes the correct set of parameters', function (done) {
        var deploymentTool = deployment.getDeploymentTool('10.0');
        deploymentTool.enumerateDevices()
            .then(function (deviceList) {
                deploymentTool.uninstallAppPackage(TEST_APP_PACKAGE_ID, deviceList[2]);
                done();
            }).fail(function err (errMsg) {
                expect(errMsg).toBeUndefined();
                done();
            });
    });
});