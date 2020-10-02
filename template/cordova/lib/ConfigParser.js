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

var Version = require('./Version');
const { ConfigParser } = require('cordova-common');
var AppxManifest = require('./AppxManifest');

var BASE_UAP_VERSION = new Version(10, 0, 10240, 0);

class WindowsConfigParser extends ConfigParser {
    startPage () {
        var content = this.doc.find('content');
        if (content) {
            return content.attrib.src;
        }
        return null;
    }

    windows_packageVersion () {
        return this.doc.getroot().attrib['windows-packageVersion'];
    }

    getConfigFiles (platform) {
        var configFiles = super.getConfigFiles(platform);
        return AppxManifest.processChanges(configFiles);
    }

    getMatchingPreferences (regexp) {
        var preferences = this.doc.findall('preference');
        var result = [];
        preferences.forEach(function (preference) {
            if (regexp.test(preference.attrib.name)) {
                result.push({ name: preference.attrib.name, value: preference.attrib.value });
            }
        });

        return result;
    }

    getWindowsTargetVersion () {
        var preference = this.getPreference('windows-target-version');

        if (!preference) { preference = '10.0'; }

        return preference;
    }

    getUAPTargetMinVersion () {
        var preference = this.getPreference('uap-target-min-version');

        if (!preference) {
            preference = '10.0.10240.0'; // set default to 10.0.10240.0 (initial release)
        }

        return preference;
    }

    getWindowsPhoneTargetVersion () {
        // This is a little more complicated than the previous one.
        // 1. Check for an explicit preference.  If the preference is set explicitly, return that, irrespective of whether it is valid
        // 2. Get the Windows baseline version.  If it's equivalent to 8.0, bump it to 8.1.
        // 3. Return the Windows baseline version.
        var explicitPreference = this.getPreference('windows-phone-target-version');
        if (explicitPreference) { return explicitPreference; }

        var windowsTargetVersion = this.getWindowsTargetVersion();
        if (windowsTargetVersion === '8' || windowsTargetVersion === '8.0') { windowsTargetVersion = '8.1'; }

        return windowsTargetVersion;
    }

    /**
     * Gets min/max UAP versions from the configuration. If no version preferences
     *   are in the configuration file, this will provide Windows.Universal at
     *   BASE_UAP_VERSION for both min and max. This will always return a rational
     *   object or will fail; for example, if a platform expects a higher
     *   min-version than max-version, it will raise the max version to the min
     *   version.
     *
     * @return {Object[]} An array of objects in the shape of:
     *   [ {'Name': 'Windows.Mobile', 'MinVersion': Version, 'MaxVersion': Version } ] (where
     *   Version is a Version object)
     *
     * @exception {RangeError} Thrown if a Version string is badly formed.
     */
    getAllMinMaxUAPVersions () {
        var uapVersionPreferenceTest = /(Microsoft.+?|Windows.+?)\-(MinVersion|MaxVersionTested)/i; /* eslint no-useless-escape : 0 */
        var platformBag = Object.create(null);

        this.getMatchingPreferences(uapVersionPreferenceTest)
            .forEach(function (verPref) {
                var matches = uapVersionPreferenceTest.exec(verPref.name);
                // 'matches' should look like: ['Windows.Universal-MinVersion', 'Windows.Universal', 'MinVersion']
                var platformName = matches[1];
                var versionPropertyName = matches[2];

                var platformVersionSet = platformBag[platformName];
                if (typeof platformVersionSet === 'undefined') {
                    platformVersionSet = { };
                    platformBag[platformName] = platformVersionSet;
                }

                var versionTest = Version.tryParse(verPref.value);
                if (!versionTest) {
                    throw new RangeError('Could not parse a valid version from the string "' + verPref.value + '" of platform-boundary "' + verPref.name + '".');
                }

                platformVersionSet[versionPropertyName] = versionTest;
            });

        for (var platformName in platformBag) {
            // Go through each and make sure there are min/max set
            var versionPref = platformBag[platformName];
            if (!versionPref.MaxVersionTested && !!versionPref.MinVersion) { // min is set, but max is not
                versionPref.MaxVersionTested = versionPref.MinVersion;
            } else if (!versionPref.MinVersion && !!versionPref.MaxVersionTested) { // max is set, min is not
                versionPref.MinVersion = versionPref.MaxVersionTested;
            } else if (!versionPref.MinVersion && !versionPref.MaxVersionTested) { // neither are set
                versionPref.MinVersion = BASE_UAP_VERSION;
                versionPref.MaxVersionTested = BASE_UAP_VERSION;
            } else { // both are set
                if (versionPref.MinVersion.gt(versionPref.MaxVersionTested)) {
                    versionPref.MaxVersionTested = versionPref.MinVersion;
                }
            }
        }

        if (Object.keys(platformBag).length === 0) {
            platformBag['Windows.Universal'] = { MinVersion: BASE_UAP_VERSION, MaxVersionTested: BASE_UAP_VERSION };
        }

        return Object.keys(platformBag).map(function (platformName) {
            return {
                Name: platformName,
                MinVersion: platformBag[platformName].MinVersion.toString(),
                MaxVersionTested: platformBag[platformName].MaxVersionTested.toString()
            };
        });
    }

    // Returns the widget defaultLocale
    defaultLocale () {
        return this.doc.getroot().attrib['defaultlocale'];
    }

    /**
     * Checks to see whether access rules or
     * @return {boolean} True if the config specifies remote URIs for access or start; false otherwise.
     */
    hasRemoteUris () {
        var test = /(https?|ms-appx-web):\/\//i;

        return test.test(this.startPage) ||
            this.getAllowNavigations()
                .some(function (rule) {
                    return test.test(rule.href);
                });
    }
}

module.exports = WindowsConfigParser;
