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

var BaseMunger = require('cordova-common').ConfigChanges.PlatformMunger;
var PlatformMunger = require('../../template/cordova/lib/ConfigChanges').PlatformMunger;
var PluginInfo = require('cordova-common').PluginInfo;
var Api = require('../../template/cordova/Api');
var AppxManifest = require('../../template/cordova/lib/AppxManifest');

var os = require('os');
var path = require('path');
var shell = require('shelljs');

var tempDir = path.join(os.tmpdir(), 'windows');
var WINDOWS_MANIFEST = 'package.windows.appxmanifest';
var WINDOWS10_MANIFEST = 'package.windows10.appxmanifest';
var FIXTURES = path.join(__dirname, 'fixtures');
var DUMMY_PLUGIN = 'org.test.plugins.capabilityplugin';

var dummyPlugin = path.join(FIXTURES, DUMMY_PLUGIN);
var dummyProjName = 'testProj';
var windowsProject = path.join(FIXTURES, dummyProjName);

describe('PlatformMunger', function () {
    var munge, munger;

    beforeEach(function () {
        shell.mkdir('-p', tempDir);
        munge = { parents: { 'foo/bar': [
            { before: undefined, count: 1, xml: '<DummyElement name="Dummy" />'}
        ]}};
        munger = new PlatformMunger('windows', tempDir);
        spyOn(BaseMunger.prototype, 'apply_file_munge').andCallThrough();
    });

    afterEach(function () {
        shell.rm('-rf', tempDir);
    });

    describe('apply_file_munge method', function () {

        it('should call parent\'s method with the same parameters', function () {
            munger.apply_file_munge(WINDOWS_MANIFEST, munge, false);
            expect(BaseMunger.prototype.apply_file_munge).toHaveBeenCalledWith(WINDOWS_MANIFEST, munge, false);
        });

        it('should additionally call parent\'s method with another munge if removing changes from windows 10 appxmanifest', function () {
            munger.apply_file_munge(WINDOWS10_MANIFEST, munge, /*remove=*/true);
            expect(BaseMunger.prototype.apply_file_munge).toHaveBeenCalledWith(WINDOWS10_MANIFEST, munge, true);
        });

        it('should remove uap: capabilities added by windows prepare step', function () {
            // Generate a munge that contain non-prefixed capabilities changes
            var baseMunge = { parents: { '/Package/Capabilities': [
                // Emulate capability that was initially added with uap prefix
                { before: undefined, count: 1, xml: '<uap:Capability Name=\"privateNetworkClientServer\">'},
                { before: undefined, count: 1, xml: '<Capability Name=\"enterpriseAuthentication\">'}
            ]}};

            var capabilitiesMunge = { parents: { '/Package/Capabilities': [
                { before: undefined, count: 1, xml: '<uap:Capability Name=\"enterpriseAuthentication\">'}
            ]}};
            munger.apply_file_munge(WINDOWS10_MANIFEST, baseMunge, /*remove=*/true);
            expect(BaseMunger.prototype.apply_file_munge).toHaveBeenCalledWith(WINDOWS10_MANIFEST, capabilitiesMunge, true);
        });
    });
});

describe('Capabilities within package.windows.appxmanifest', function() {

    var testDir, windowsPlatform, windowsManifest, windowsManifest10, dummyPluginInfo, api;

    beforeEach(function() {
        testDir = path.join(__dirname, 'testDir');
        shell.mkdir('-p', testDir);
        shell.cp('-rf', windowsProject + '/*', testDir);
        windowsPlatform = path.join(testDir, 'platforms/windows');
        windowsManifest = path.join(windowsPlatform, WINDOWS_MANIFEST);
        windowsManifest10 = path.join(windowsPlatform, WINDOWS10_MANIFEST);
        dummyPluginInfo = new PluginInfo(dummyPlugin);
        api = new Api();
        api.root = windowsPlatform;
        api.locations.root = windowsPlatform;
        api.locations.www = path.join(windowsPlatform, 'www');
    });

    afterEach(function() {
        shell.rm('-rf', testDir);
    });

    function getPluginCapabilities(pluginInfo) {
        return pluginInfo.getConfigFiles()[0].xmls;
    }

    function getManifestCapabilities(manifest) {
        var appxmanifest = AppxManifest.get(manifest, true);
        return appxmanifest.getCapabilities();
    }

    var fail = jasmine.createSpy('fail')
    .andCallFake(function (err) {
        console.error(err);
    });

    it('should be removed using overriden PlatformMunger', function(done) {
        api.addPlugin(dummyPluginInfo)
        .then(function() {
            //  There is the one default capability in manifest with 'internetClient' name
            expect(getManifestCapabilities(windowsManifest).length).toBe(getPluginCapabilities(dummyPluginInfo).length + 1);
            api.removePlugin(dummyPluginInfo);
        })
        .then(function() {
            expect(getManifestCapabilities(windowsManifest).length).toBe(1);
        })
        .catch(fail)
        .finally(function() {
            expect(fail).not.toHaveBeenCalled();
            done();
        });
    });

    it('should be added with uap prefixes when install plugin', function(done) {
        api.addPlugin(dummyPluginInfo)
        .then(function() {
            //  There is the one default capability in manifest with 'internetClient' name
            var manifestCapabilities = getManifestCapabilities(windowsManifest10);
            expect(manifestCapabilities.length).toBe(getPluginCapabilities(dummyPluginInfo).length + 1);

            //  Count 'uap' prefixed capabilities
            var uapPrefixedCapsCount = manifestCapabilities.filter(function(capability) {
                return capability.type === 'uap:Capability';
            }).length;

            expect(uapPrefixedCapsCount).toBe(2);
            api.removePlugin(dummyPluginInfo);
        })
        .then(function() {
            expect(getManifestCapabilities(windowsManifest10).length).toBe(1);
        })
        .catch(fail)
        .finally(function() {
            expect(fail).not.toHaveBeenCalled();
            done();
        });
    });

    it('should be added as DeviceCapabilities when install plugin', function(done) {
        function isDeviceCapability(capability) {
            return capability.type === 'DeviceCapability';
        }

        function checkCapabilitiesAfterInstall(manifest) {
            //  There is the one default capability in manifest with 'internetClient' name
            var manifestCapabilities = getManifestCapabilities(manifest);
            var pluginCapabilities = getPluginCapabilities(dummyPluginInfo);

            expect(manifestCapabilities.length).toBe(pluginCapabilities.length + 1);

            var manifestDeviceCapabilties = manifestCapabilities.filter(isDeviceCapability);
            expect(manifestDeviceCapabilties.length).toBe(1);
        }

        function checkCapabilitiesAfterRemove(manifest) {
            var manifestCapabilities = getManifestCapabilities(manifest);
            expect(manifestCapabilities.length).toBe(1);
        }

        api.addPlugin(dummyPluginInfo)
        .then(function() {
            checkCapabilitiesAfterInstall(windowsManifest);
            checkCapabilitiesAfterInstall(windowsManifest10);
            api.removePlugin(dummyPluginInfo);
        })
        .then(function() {
            checkCapabilitiesAfterRemove(windowsManifest);
            checkCapabilitiesAfterRemove(windowsManifest10);
        })
        .catch(fail)
        .finally(function() {
            expect(fail).not.toHaveBeenCalled();
            done();
        });
    });
});

