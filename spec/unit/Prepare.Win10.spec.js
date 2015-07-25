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

var rewire  = require('rewire'),
    prepare = rewire('../../template/cordova/lib/prepare'),
    Version = require('../../template/cordova/lib/Version'),
    et      = require('elementtree'),
    fs      = require('fs'),
    getAllMinMaxUAPVersions         = prepare.__get__('getAllMinMaxUAPVersions'),
    applyCoreProperties             = prepare.__get__('applyCoreProperties'),
    applyAccessRules                = prepare.__get__('applyAccessRules'),
    checkForRestrictedCaps          = prepare.__get__('checkForRestrictedCapabilities'),
    ensureUapPrefixedCapabilities   = prepare.__get__('ensureUapPrefixedCapabilities');

var Win10ManifestPath = 'template/package.windows10.appxmanifest',
    Win81ManifestPath = 'template/package.windows.appxmanifest';

/***
  * Unit tests for validating that min/max versions are correctly obtained 
  * (for the function getAllMinMaxUAPVersions) from prepare.js.
  **/
describe('Min/Max UAP versions are correctly read from the config file.', function() {

    var mockConfig = {
        getMatchingPreferences: function(regexp) {
            return [
                { name: 'Windows.Universal-MinVersion', value: '10.0.9910.0' },
                { name: 'Windows.Universal-MaxVersionTested', value: '10.0.9917.0' },
                { name: 'Windows.Desktop-MinVersion', value: '10.0.9910.0' },
                { name: 'Microsoft.Xbox-MaxVersionTested', value: '10.0.9917.0' }
            ];
        }
    };

    it('Should correctly transform all versions as a baseline.', function() {
        var versionSet = getAllMinMaxUAPVersions(mockConfig);
        var ver9910 = new Version(10, 0, 9910, 0);
        var ver9917 = new Version(10, 0, 9917, 0);

        expect(versionSet['Windows.Universal']).toBeDefined();
        expect(ver9910.eq(versionSet['Windows.Universal'].MinVersion)).toBe(true);
        expect(ver9917.eq(versionSet['Windows.Universal'].MaxVersionTested)).toBe(true);

        expect(versionSet['Windows.Desktop']).toBeDefined();
        expect(ver9910.eq(versionSet['Windows.Desktop'].MinVersion)).toBe(true);
        expect(ver9910.eq(versionSet['Windows.Desktop'].MaxVersionTested)).toBe(true);

        expect(versionSet['Microsoft.Xbox']).toBeDefined();
        expect(ver9917.eq(versionSet['Microsoft.Xbox'].MinVersion)).toBe(true);
        expect(ver9917.eq(versionSet['Microsoft.Xbox'].MaxVersionTested)).toBe(true);

        expect(Object.keys(versionSet).length).toBe(3);
    });

});

describe('Min/Max UAP versions are produced correctly even when the config file has no settings.', function() {
    var mockConfig = {
        getMatchingPreferences: function(regexp) {
            return [];
        }
    };

    it('Should correctly transform all versions as a baseline.', function() {
        var versionSet = getAllMinMaxUAPVersions(mockConfig);
        var verBaseline = prepare.__get__('BASE_UAP_VERSION');

        expect(versionSet['Windows.Universal']).toBeDefined();
        expect(verBaseline.eq(versionSet['Windows.Universal'].MinVersion)).toBe(true);
        expect(verBaseline.eq(versionSet['Windows.Universal'].MaxVersionTested)).toBe(true);

        expect(Object.keys(versionSet).length).toBe(1);
    });
});

describe('Min/Max UAP versions are correctly read from the config file.', function() {

    var mockConfig = {
        getMatchingPreferences: function(regexp) {
            return [
                { name: 'Windows.Universal-MinVersion', value: '10.0.9910.f' },
                { name: 'Windows.Universal-MaxVersionTested', value: '10.0.9917.0' },
            ];
        }
    };

    it('Should fail to produce min/max versions with a RangeError.', function() {
        try {
            getAllMinMaxUAPVersions(mockConfig);
            expect(false).toBe(true);
        }
        catch (ex) {
            expect(ex.constructor).toBe(RangeError);
        }
    });

});

/***
  * Unit tests for validating default ms-appx-web:// URI scheme in Win10
  * (for the function applyCoreProperties) from prepare.js.
  **/
var PreferencesBaseline = { 
    Orientation: null,
    WindowsDefaultUriPrefix: null,
    WindowsStoreDisplayName: null,
    WindowsStorePublisherName: null
};
function createMockConfigAndManifestForApplyCoreProperties(startPage, preferences, win10) {
    if (!preferences) {
        preferences = { };
    }
    /* jshint proto: true */
    preferences.__proto__ = PreferencesBaseline;
    /* jshint proto: false */
    var config = {
        version: function() { return '1.0.0.0'; },
        name: function() { return 'HelloCordova'; },
        packageName: function() { return 'org.apache.cordova.HelloCordova'; },
        author: function() { return 'Apache'; },
        startPage: function() { return startPage; },
        getPreference: function(preferenceName) {
            if (typeof preferences[preferenceName] !== 'undefined') {
                return preferences[preferenceName];
            } else {
                throw new RangeError('Unexpected call to config.getPreference with "' + preferenceName + '" in unit test.');
            }
        }
    };

    var filePath = win10 ? Win10ManifestPath : Win81ManifestPath;
    var fileContents = fs.readFileSync(filePath, 'utf-8');
    var manifest = new et.ElementTree(et.XML(fileContents.trim()));

    return { config: config, manifest: manifest };
}

function addCapabilityDeclarationToMockManifest(manifest, capability) {
    var capRoot = manifest.find('.//Capabilities');
    var cap = new et.Element('Capability');
    cap.attrib.Name = capability;
    capRoot.append(cap);
}

describe('A Windows 8.1 project should not have an HTTP or HTTPS scheme for its startup URI.', function() {

    // arrange
    var mockConfig = createMockConfigAndManifestForApplyCoreProperties('index.html', { 'WindowsDefaultUriPrefix': 'http://' }, false);

    // act
    applyCoreProperties(mockConfig.config, mockConfig.manifest, 'fake-path', 'm2:', false);

    var app = mockConfig.manifest.find('.//Application');
    expect(app.attrib.StartPage).toBe('www/index.html');
});

describe('A Windows 8.1 project should not have any scheme for its startup URI.', function() {

    // arrange
    var mockConfig = createMockConfigAndManifestForApplyCoreProperties('index.html', { 'WindowsDefaultUriPrefix': 'ms-appx://' }, false);

    // act
    applyCoreProperties(mockConfig.config, mockConfig.manifest, 'fake-path', 'm2:', false);

    var app = mockConfig.manifest.find('.//Application');
    expect(app.attrib.StartPage).toBe('www/index.html');
});

describe('A Windows 10 project default to ms-appx-web for its startup URI.', function() {

    // arrange
    var mockConfig = createMockConfigAndManifestForApplyCoreProperties('index.html', { }, true);

    // act
    applyCoreProperties(mockConfig.config, mockConfig.manifest, 'fake-path', 'uap:', true);

    var app = mockConfig.manifest.find('.//Application');
    expect(app.attrib.StartPage).toBe('ms-appx-web:///www/index.html');
});

describe('A Windows 10 project should allow ms-appx as its startup URI, and it gets removed from the final output.', function() {

    // arrange
    var mockConfig = createMockConfigAndManifestForApplyCoreProperties('index.html', { 'WindowsDefaultUriPrefix': 'ms-appx://' }, true);

    // act
    applyCoreProperties(mockConfig.config, mockConfig.manifest, 'fake-path', 'uap:', true);

    var app = mockConfig.manifest.find('.//Application');
    expect(app.attrib.StartPage).toBe('www/index.html');
});

describe('A Windows 10 project should allow an HTTP or HTTPS scheme for its startup URI.', function() {

    // arrange
    var mockConfig = createMockConfigAndManifestForApplyCoreProperties('www.contoso.com/', { 'WindowsDefaultUriPrefix': 'http://' }, true);

    // act
    applyCoreProperties(mockConfig.config, mockConfig.manifest, 'fake-path', 'uap:', true);

    var app = mockConfig.manifest.find('.//Application');
    expect(app.attrib.StartPage).toBe('http://www.contoso.com/');
});

describe('An app specifying a Store DisplayName in its config.xml should have it reflected in the manifest.', function() {

    // arrange
    var mockConfig = createMockConfigAndManifestForApplyCoreProperties('www.contoso.com/', { 'WindowsDefaultUriPrefix': 'http://', 'WindowsStoreDisplayName': 'ContosoApp' }, true);

    // act
    applyCoreProperties(mockConfig.config, mockConfig.manifest, 'fake-path', 'uap:', true);

    var app = mockConfig.manifest.find('.//Properties/DisplayName');
    expect(app.text).toBe('ContosoApp');
});

describe('An app specifying a Store PublisherName in its config.xml should have it reflected in the manifest.', function() {

    // arrange
    var mockConfig = createMockConfigAndManifestForApplyCoreProperties('www.contoso.com/', { 'WindowsDefaultUriPrefix': 'http://', 'WindowsStorePublisherName': 'Contoso Inc' }, true);

    // act
    applyCoreProperties(mockConfig.config, mockConfig.manifest, 'fake-path', 'uap:', true);

    var app = mockConfig.manifest.find('.//Properties/PublisherDisplayName');
    expect(app.text).toBe('Contoso Inc');
});

describe('A Windows 10 project should warn if it supports remote mode and restricted capabilities.', function() {

    // arrange
    var mockConfig = createMockConfigAndManifestForApplyAccessRules(true, 'http://www.bing.com/*');
    addCapabilityDeclarationToMockManifest(mockConfig.manifest, 'documentsLibrary');

    var stringFound     = false,
        searchStr       = '   documentsLibrary',
        oldConsoleWarn  = console.warn;

    beforeEach(function() {
        stringFound = false;
        spyOn(console, 'warn').andCallFake(function(msg) {
            if (msg === searchStr)
                stringFound = true;
        });
    });
    afterEach(function() {
        console.warn = oldConsoleWarn;
    });

    
    it('asserts that the documentsLibrary capability is restricted', function() {
        // act
        checkForRestrictedCaps(mockConfig.config, mockConfig.manifest);

        // assert
        expect(stringFound).toBe(true);
    });
});

/***
  * Unit tests for validating that access rules get correctly applied
  * (for the function applyAccessRules) from prepare.js.
  **/

function createMockConfigAndManifestForApplyAccessRules(isWin10) {
    var rules = [];
    for (var i = 1; i < arguments.length; i++) {
        rules.push(arguments[i]);
    }

    var config = {
        version: function() { return '1.0.0.0'; },
        name: function() { return 'HelloCordova'; },
        packageName: function() { return 'org.apache.cordova.HelloCordova'; },
        author: function() { return 'Apache'; },
        startPage: function() { return 'index.html'; },
        getPreference: function(preferenceName) {
            if (preferenceName === 'WindowsDefaultUriPrefix') {
                return isWin10 ? 'ms-appx-web://' : 'ms-appx://';
            }
            else {
                throw new RangeError('Unexpected call to config.getPreference in unit test.');
            }
        }, 
        getAccessRules: function() {
            if (isWin10) {
                return [];
            }

            return rules;
        },
        getNavigationWhitelistRules: function() {
            if (isWin10) {
                return rules;
            }

            return [];
        }
    };

    var filePath = isWin10 ? Win10ManifestPath : Win81ManifestPath;
    var fileContents = fs.readFileSync(filePath, 'utf-8');
    var manifest = new et.ElementTree(et.XML(fileContents.trim()));

    return { config: config, manifest: manifest };
}

describe('A Windows 8.1 project should not have WindowsRuntimeAccess attributes in access rules.', function() {

    var mockConfig = createMockConfigAndManifestForApplyAccessRules(false, 'https://www.contoso.com');

    applyAccessRules(mockConfig.config, mockConfig.manifest, false);

    var app         = mockConfig.manifest.find('.//Application'),
        accessRules = app.find('.//ApplicationContentUriRules');

    expect(accessRules).toBeDefined();
    expect(accessRules.len()).toBe(1);

    var rule = accessRules.getItem(0);
    expect(rule).toBeDefined();
    expect(rule.attrib.WindowsRuntimeAccess).toBeUndefined();

});

describe('A Windows 10 project should have WindowsRuntimeAccess attributes in access rules.', function() {

    var mockConfig = createMockConfigAndManifestForApplyAccessRules(true, 'https://www.contoso.com');

    applyAccessRules(mockConfig.config, mockConfig.manifest, true);

    var app         = mockConfig.manifest.find('.//Application'),
        accessRules = app.find('.//uap:ApplicationContentUriRules');

    expect(accessRules).toBeDefined();
    expect(accessRules.len()).toBe(2);

    var rule = accessRules.getItem(0);
    expect(rule).toBeDefined();
    expect(rule.attrib.WindowsRuntimeAccess).toBeDefined();
    expect(rule.attrib.WindowsRuntimeAccess).toBe('all');

});

describe('A Windows 8.1 project should reject http:// URI scheme rules.', function() {
    
    var stringIndex     = -1,
        searchStr       = 'Access rules must begin with "https://", the following rule will be ignored: ',
        oldConsoleWarn  = console.warn;
    beforeEach(function() {
        spyOn(console, 'warn').andCallFake(function(msg) {
            stringIndex = msg.indexOf(searchStr);
        });
    });
    afterEach(function() {
        console.warn = oldConsoleWarn;
    });
    
    it('applies access rules and verifies at least one was rejected', function() {
        var mockConfig = createMockConfigAndManifestForApplyAccessRules(false, 'http://www.contoso.com');
        applyAccessRules(mockConfig.config, mockConfig.manifest, false);

        expect(stringIndex).toBe(0);
    });
});

describe('A Windows 10 project should accept http:// URI access rules.', function() {

    var stringIndex     = -1,
        searchStr       = 'The following navigation rule had an invalid URI scheme and is ignored:',
        oldConsoleWarn  = console.warn;
    beforeEach(function() {
        spyOn(console, 'warn').andCallFake(function(msg) {
            stringIndex = msg.indexOf(searchStr);
        });
    });
    afterEach(function() {
        console.warn = oldConsoleWarn;
    });

    it('applies access rules and verifies they were accepted', function() {
        var mockConfig = createMockConfigAndManifestForApplyAccessRules(true, 'http://www.contoso.com');
        applyAccessRules(mockConfig.config, mockConfig.manifest, true);

        expect(stringIndex).toBe(-1);
    });

});

describe('A Windows 10 project should apply the uap: namespace prefix to certain capabilities.', function() {
    
    var element = null;

    beforeEach(function() {
        element = new et.Element('Capabilities');
        element.append(new et.Element('Capability', { Name: 'internetClient' }));
        element.append(new et.Element('Capability', { Name: 'documentsLibrary' }));
        element.append(new et.Element('DeviceCapability', { Name: 'location' }));
    });

    it('Applies the uap: prefix to the documentsLibrary capability.', function() {
        ensureUapPrefixedCapabilities(element);
        var children = element.getchildren();
        var testResults = {};
        // map capabilities to tag
        children.forEach(function(child) {
            testResults[child.attrib.Name] = child.tag;
        });

        expect(testResults.internetClient).toBe('Capability');
        expect(testResults.documentsLibrary).toBe('uap:Capability');
        expect(testResults.location).toBe('DeviceCapability');
    });
});
