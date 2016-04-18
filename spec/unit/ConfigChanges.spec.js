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

var os = require('os');
var path = require('path');
var shell = require('shelljs');

var tempDir = path.join(os.tmpdir(), 'windows');
var WINDOWS_MANIFEST = 'package.windows.appxmanifest';
var WINDOWS10_MANIFEST = 'package.windows10.appxmanifest';

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
            munger.apply_file_munge('package.windows10.appxmanifest', munge, /*remove=*/true);
            expect(BaseMunger.prototype.apply_file_munge).toHaveBeenCalledWith(WINDOWS10_MANIFEST, munge, true);
            expect(BaseMunger.prototype.apply_file_munge).toHaveBeenCalledWith(WINDOWS10_MANIFEST, jasmine.any(Object), true);
        });

        it('should remove uap: capabilities added by windows prepare step', function () {
            // Generate a munge that contain non-prefixed capabilities changes
            var baseMunge = { parents: { WINDOWS10_MANIFEST: [
                // Emulate capability that was initially added with uap prefix
                { before: undefined, count: 1, xml: '<uap:Capability Name=\"privateNetworkClientServer\">'},
                { before: undefined, count: 1, xml: '<Capability Name=\"enterpriseAuthentication\">'}
            ]}};

            var capabilitiesMunge = { parents: { WINDOWS10_MANIFEST: [
                { before: undefined, count: 1, xml: '<uap:Capability Name=\"enterpriseAuthentication\">'}
            ]}};

            munger.apply_file_munge('package.windows10.appxmanifest', baseMunge, /*remove=*/true);
            expect(BaseMunger.prototype.apply_file_munge).toHaveBeenCalledWith(WINDOWS10_MANIFEST, capabilitiesMunge, true);
        });
    });
});

