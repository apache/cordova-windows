/*
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

var path            = require('path'),
    fs              = require('fs'),
    et              = require('elementtree'),
    subElement      = et.SubElement,
    shell           = require('shelljs'),
    MSBuildTools    = require('./MSBuildTools'),
    Version         = require('./Version'),
    ConfigParser    = require('./ConfigParser');

var ROOT = path.join(__dirname, '..', '..'),
    PROJECT_WINDOWS10   = 'CordovaApp.Windows10.jsproj',
    MANIFEST_WINDOWS8   = 'package.windows80.appxmanifest',
    MANIFEST_WINDOWS    = 'package.windows.appxmanifest',
    MANIFEST_PHONE      = 'package.phone.appxmanifest',
    MANIFEST_WINDOWS10  = 'package.windows10.appxmanifest',
    JSPROJ_WINDOWS8     = 'CordovaApp.Windows80.jsproj',
    JSPROJ_WINDOWS      = 'CordovaApp.Windows.jsproj',
    JSPROJ_PHONE        = 'CordovaApp.Phone.jsproj',
    JSPROJ_WINDOWS10    = 'CordovaApp.Windows10.jsproj',
    BASE_UAP_VERSION    = new Version(10, 0, 10030, 0),
    UAP_RESTRICTED_CAPS = ['enterpriseAuthentication', 'sharedUserCertificates', 
                           'documentsLibrary', 'musicLibrary', 'picturesLibrary', 
                           'videosLibrary', 'removableStorage', 'internetClientClientServer', 
                           'privateNetworkClientServer'],
    // UAP namespace capabilities come from the XSD type ST_Capability_Uap from AppxManifestTypes.xsd
    CAPS_NEEDING_UAPNS  = ['documentsLibrary', 'picturesLibrary', 'videosLibrary', 
                           'musicLibrary', 'enterpriseAuthentication', 'sharedUserCertificates', 
                           'removableStorage', 'appointments', 'contacts', 'userAccountInformation',
                           'phoneCall', 'blockedChatMessages', 'objects3D'];

module.exports.applyPlatformConfig = function () {
    console.log('Applying Platform Config...');

    var config = new ConfigParser(path.join(ROOT, 'config.xml'));

    var isTargetingWin10 = false;
    var winTargetVersion = config.getWindowsTargetVersion();
    if (winTargetVersion === '10.0' || winTargetVersion === 'UAP') {
        isTargetingWin10 = true;
    }

    // Apply appxmanifest changes
    [{ fileName: MANIFEST_WINDOWS,   namespacePrefix: 'm2:' }, 
     { fileName: MANIFEST_WINDOWS8,  namespacePrefix: '' },
     { fileName: MANIFEST_PHONE,     namespacePrefix: 'm3:' }].forEach(
        function(manifestFile) {
            updateManifestFile(config, path.join(ROOT, manifestFile.fileName), manifestFile.namespacePrefix, null);
    });

    // Apply jsproj changes
    [JSPROJ_PHONE, JSPROJ_WINDOWS, JSPROJ_WINDOWS8, JSPROJ_WINDOWS10].forEach(
        function(jsprojFile) {
            updatejsprojFile(config, path.join(ROOT, jsprojFile));
    });

    // Break out Windows 10-specific functionality because we also need to 
    // apply UAP versioning to Windows 10 appx-manifests.
    var uapVersionInfo = getUAPVersions(config);

    if (uapVersionInfo) {
        updateManifestFile(config, path.join(ROOT, MANIFEST_WINDOWS10), 'uap:', uapVersionInfo);

        applyUAPVersionToProject(path.join(ROOT, PROJECT_WINDOWS10), uapVersionInfo);
    }
    else if (isTargetingWin10) {
        console.warn('Warning: Requested build targeting Windows 10, but Windows 10 tools were not detected on the system.');
    }

    copyImages(config);
};

function updatejsprojFile(config, jsProjFilePath) {
    var defaultLocale = config.defaultLocale() || 'en-US';

    var contents = fs.readFileSync(jsProjFilePath, 'utf-8');
    // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
    if (contents.charCodeAt(0) === 0xFEFF) {
        contents = contents.slice(1);
    }
    var jsProjXML =  new et.ElementTree(et.XML(contents));
    var jsProjDefaultLocale = jsProjXML.find('./PropertyGroup/DefaultLanguage');
    jsProjDefaultLocale.text = defaultLocale;
    fs.writeFileSync(jsProjFilePath, jsProjXML.write({indent: 2}), 'utf-8');
}

function updateManifestFile (config, manifestPath, namespacePrefix, uapVersionInfo) {
    var contents = fs.readFileSync(manifestPath, 'utf-8');
    if(contents) {
        //Windows is the BOM. Skip the Byte Order Mark.
        contents = contents.substring(contents.indexOf('<'));
    }

    var manifest =  new et.ElementTree(et.XML(contents));

    applyCoreProperties(config, manifest, manifestPath, namespacePrefix, !!uapVersionInfo); 
    // sort Capability elements as per CB-5350 Windows8 build fails due to invalid 'Capabilities' definition
    sortCapabilities(manifest);
    applyAccessRules(config, manifest, !!uapVersionInfo); 
    applyBackgroundColor(config, manifest, namespacePrefix);

    if (uapVersionInfo) {
        applyTargetPlatformVersion(config, manifest, uapVersionInfo);
        checkForRestrictedCapabilities(config, manifest);
        ensureUapPrefixedCapabilities(manifest.find('.//Capabilities'));
    }

    //Write out manifest
    fs.writeFileSync(manifestPath, manifest.write({indent: 4}), 'utf-8');
}

function applyCoreProperties(config, manifest, manifestPath, xmlnsPrefix, targetWin10) {
    var version = fixConfigVersion(config.version());
    var name = config.name();
    var pkgName = config.packageName();
    var author = config.author();

    var identityNode = manifest.find('.//Identity');
    if(!identityNode) {
        throw new Error('Invalid manifest file (no <Identity> node): ' + manifestPath);
    }
    // Update identity name and version
    if (pkgName) {
        (identityNode.attrib.Name = pkgName);
    }
    if (version) {
        (identityNode.attrib.Version = version);
    }

    // Update name (windows8 has it in the Application[@Id] and Application.VisualElements[@DisplayName])
    var app = manifest.find('.//Application');
    if(!app) {
        throw new Error('Invalid manifest file (no <Application> node): ' + manifestPath);
    }
    if (pkgName) {
        // 64 symbols restriction goes from manifest schema definition
        // http://msdn.microsoft.com/en-us/library/windows/apps/br211415.aspx
        var appId = pkgName.length <= 64 ? pkgName : pkgName.substr(0, 64);
        app.attrib.Id = appId;
    }

    applyStartPage(app, config, targetWin10); 

    var visualElementsName = './/' + xmlnsPrefix + 'VisualElements'; 
    var visualElems = manifest.find(visualElementsName); 

    if(!visualElems) {
        throw new Error('Invalid manifest file (no <' + xmlnsPrefix + 'VisualElements> node): ' + manifestPath);
    }
    if (name) {
        (visualElems.attrib.DisplayName = name);
    }

    // Update properties
    var properties = manifest.find('.//Properties');
    if (properties && properties.find) {
        var displayNameElement = properties.find('.//DisplayName');
        if (displayNameElement && name) {
            displayNameElement.text = name;
        }

        var publisherNameElement = properties.find('.//PublisherDisplayName');
        if (publisherNameElement && author) {
            publisherNameElement.text = author;
        }
    }

    // Supported orientations
    var rotationPreferenceName = xmlnsPrefix + 'Rotation';
    var rotationPreferenceRootName = xmlnsPrefix + 'InitialRotationPreference';

    var orientation = config.getPreference('Orientation');
    var rotationPreferenceRoot;
    if (orientation) {
        rotationPreferenceRoot = manifest.find('.//' + rotationPreferenceRootName);
        if(rotationPreferenceRoot === null) {
            visualElems.append(et.Element(rotationPreferenceRootName));
            rotationPreferenceRoot = manifest.find('.//' + rotationPreferenceRootName);
        }

        rotationPreferenceRoot.clear();

        var applyOrientations = function(orientationsArr) {
            orientationsArr.forEach(function(orientationValue) {
                var el = et.Element(rotationPreferenceName);
                el.attrib.Preference = orientationValue;
                rotationPreferenceRoot.append(el);
            });
        };

        // Updates supported orientations
        //<InitialRotationPreference>
        //    <Rotation Preference = "portrait" | "landscape" | "portraitFlipped" | "landscapeFlipped" /> {1,4}
        //</InitialRotationPreference>
        if(orientation === 'default') {
            // This means landscape and portrait
            applyOrientations(['portrait', 'landscape', 'landscapeFlipped']);
        } else if(orientation === 'portrait') {
            applyOrientations(['portrait']);
        } else if(orientation === 'landscape') {
            applyOrientations(['landscape', 'landscapeFlipped']);
        } else { // Platform-specific setting like "portrait,landscape,portraitFlipped"
            applyOrientations(orientation.split(','));
        }
    } else {
        // Remove InitialRotationPreference root element to revert to defaults
        rotationPreferenceRoot = visualElems.find('.//' + rotationPreferenceRootName);
        if(rotationPreferenceRoot !== null) {
            visualElems.remove(null, rotationPreferenceRoot);
        }
    }
}

function applyStartPage(appNode, config, targetingWin10) {
    var startPage = config.startPage();

    if (!startPage) {
        // If not specified, set default value
        // http://cordova.apache.org/docs/en/edge/config_ref_index.md.html#The%20config.xml%20File
        startPage = 'index.html';
    }

    var uriPrefix = '';
    if (targetingWin10) {
        // for Win10, we respect config options such as WindowsDefaultUriPrefix and default to 
        // ms-appx-web:// as the homepage.  Set those here.

        // Only add a URI prefix if the start page doesn't specify a URI scheme
        if (!(/^[\w-]+?\:\/\//i).test(startPage)) {
            uriPrefix = config.getPreference('WindowsDefaultUriPrefix');
            if (!uriPrefix) {
                uriPrefix = 'ms-appx-web://';
            }
            else if (/^ms\-appx\:\/\/$/i.test(uriPrefix)) { 
                // Explicitly ignore the ms-appx:// scheme because it doesn't validate
                // in the Windows 10 build schema (treat it as the root).
                uriPrefix = '';
            }
        }
    }

    var startPagePrefix = 'www/';
    if ((uriPrefix && uriPrefix.toLowerCase().substring(0, 4) === 'http') || 
        startPage.toLowerCase().substring(0, 4) === 'http') {
        startPagePrefix = '';
    }
    else if (uriPrefix.toLowerCase().substring(0, 7) === 'ms-appx') {
        uriPrefix += '/'; // add a 3rd trailing forward slash for correct area resolution
    }

    appNode.attrib.StartPage = uriPrefix + startPagePrefix + startPage;
}

// Adjust version number as per CB-5337 Windows8 build fails due to invalid app version
function fixConfigVersion (version) {
    if(version && version.match(/\.\d/g)) {
        var numVersionComponents = version.match(/\.\d/g).length + 1;
        while (numVersionComponents++ < 4) {
            version += '.0';
        }
    }
    return version;
}

function applyAccessRules (config, manifest, isTargetingWin10) {
    // Updates WhiteListing rules
    //<ApplicationContentUriRules>
    //    <Rule Match="https://www.example.com" Type="include"/>
    //</ApplicationContentUriRules>

    var AppContentUriRulesElementName = 'ApplicationContentUriRules',
        RuleElementName = 'Rule';

    if (isTargetingWin10) {
        return applyNavigationWhitelist(config, manifest);
    }

    
    var accessRules = config.getAccessRules().filter(function(rule) {
        // https:// rules are always good, * rules are always good
        if (rule.indexOf('https://') === 0 || rule === '*') {
            return true;
        } else {
            console.warn('Access rules must begin with "https://", the following rule will be ignored: ' + rule);
        }
        return false;
    });

    // If * is specified, emit no access rules.
    if (accessRules.indexOf('*') > -1) {
        accessRules = [];
    }

    createApplicationContentUriRules(manifest, AppContentUriRulesElementName, RuleElementName, accessRules, { Type: 'include' });
}

/** 
 * Windows 10-based whitelist-plugin-compatible support for the enhanced navigation whitelist.
 * Allows WinRT access to origins specified by <allow-navigation href="origin" /> elements.
 */
function applyNavigationWhitelist(config, manifest) {
    var AppContentUriRulesElementName = 'uap:ApplicationContentUriRules';
    var RuleElementName = 'uap:Rule';
    var UriSchemeTest = /^(?:https?|ms-appx-web):\/\//i;

    var whitelistRules = config.getNavigationWhitelistRules().filter(function(rule) {
        if (UriSchemeTest.test(rule)) {
            return true;
        } else {
            console.warn('The following navigation rule had an invalid URI scheme and is ignored: "' + rule + '".');
        }
        return false;
    });

    var defaultPrefix = config.getPreference('WindowsDefaultUriPrefix');
    if ('ms-appx://' !== defaultPrefix) {
        var hasMsAppxWeb = whitelistRules.some(function(rule) {
            return /^ms-appx-web:\/\/\/$/i.test(rule);
        });
        if (!hasMsAppxWeb) {
            whitelistRules.push('ms-appx-web:///');
        }
    }

    createApplicationContentUriRules(manifest, AppContentUriRulesElementName, RuleElementName, whitelistRules, { 
        Type: 'include', 
        WindowsRuntimeAccess: 'all'
    });
}

/**
 * Private function used by applyNavigationWhitelist and applyAccessRules
 * which creates the corresponding section in the app manifest.
 * @param manifest {et.ElementTree} The manifest document.
 * @param acurElementName {string} The name of the AccessContentUriRules element, including prefix if applicable.
 * @param ruleElementName {string} The name of the Rule element, including prefix if applicable.
 * @param rulesOrigins {string[]} The origins that will be permitted.
 * @param commonAttributes {Object} Property bag of additional attributes that should be applied to every rule.
 */
function createApplicationContentUriRules(manifest, acurElementName, ruleElementName, rulesOrigins, commonAttributes) {
    var appUriRulesRoot = manifest.find('.//Application'),
        appUriRules = appUriRulesRoot.find(acurElementName);

    if (appUriRules !== null) {
        appUriRulesRoot.remove(null, appUriRules);
    }

    // No rules defined
    if (rulesOrigins.length === 0) {
        return;
    }

    appUriRules = et.Element(acurElementName);
    appUriRulesRoot.append(appUriRules);

    rulesOrigins.forEach(function(rule) {
        var el = et.Element(ruleElementName);
        el.attrib.Match = rule;

        var attributes = Object.keys(commonAttributes);
        attributes.forEach(function(attributeName) {
            el.attrib[attributeName] = commonAttributes[attributeName];
        });
        appUriRules.append(el);
    });
}

function sortCapabilities(manifest) {

    // removes namespace prefix (m3:Capability -> Capability)
    // this is required since elementtree returns qualified name with namespace
    function extractLocalName(tag) {
        return tag.split(':').pop(); // takes last part of string after ':'
    }

    var capabilitiesRoot = manifest.find('.//Capabilities'),
        capabilities = capabilitiesRoot._children || [];
    // to sort elements we remove them and then add again in the appropriate order
    capabilities.forEach(function(elem) { // no .clear() method
        capabilitiesRoot.remove(0, elem);
        // CB-7601 we need local name w/o namespace prefix to sort capabilities correctly
        elem.localName = extractLocalName(elem.tag);
    });
    capabilities.sort(function(a, b) {
        return (a.localName > b.localName) ? 1: -1;
    });
    capabilities.forEach(function(elem) {
        capabilitiesRoot.append(elem);
    });
}

function checkForRestrictedCapabilities(config, manifest) {
    var hasRemoteUris = checkForRemoteModeUris(config);
    if (hasRemoteUris) {
        var capabilitiesRoot = manifest.find('.//Capabilities');
        var badCaps = checkForRestrictedRemoteCapabilityDeclarations(capabilitiesRoot);
        if (badCaps) {
            console.warn('The following Capabilities were declared and are restricted:');
            console.warn('   ' + badCaps.join(','));
            console.warn('You will be unable to on-board your app to the public Windows Store with');
            console.warn(' these capabilities and access rules permitting access to remote URIs.');
        }
    }
}

function copyImages(config) {
    var platformRoot = ROOT;
    // TODO find the way to detect whether command was triggered by CLI or not
    var appRoot = path.join(platformRoot, '..', '..');

    function copyImage(src, dest) {
        src = path.join(appRoot, src);
        dest = path.join(platformRoot, 'images', dest);
        //console.log('Copying image from ' + src + ' to ' + dest);
        shell.cp('-f', src, dest);
    }

    function copyMrtImage(src, dest) {
        var srcDir = path.dirname(src),
            srcExt = path.extname(src),
            srcFileName = path.basename(src, srcExt);
     
        var destExt = path.extname(dest),
            destFileName = path.basename(dest, destExt);

        // all MRT images: logo.png, logo.scale-100.png, logo.scale-200.png, etc
        var images = fs.readdirSync(srcDir).filter(function(e) { 
            return e.match('^'+srcFileName + '(.scale-[0-9]+)?' + srcExt);
        });
        // warn if no images found
        if (images.length === 0) {
            console.log('No images found for target: ' + destFileName);
            return;
        }
        // copy images with new name but keeping scale suffix
        images.forEach(function(img) {
            var scale = path.extname(path.basename(img, srcExt));
            if (scale === '') {
                scale = '.scale-100';
            }
            copyImage(path.join(srcDir, img), destFileName+scale+destExt);
        });
        
    }

    // Platform default images
    var platformImages = [
        {dest: 'Square150x150Logo.scale-100.png', width: 150, height: 150},
        {dest: 'Square30x30Logo.scale-100.png', width: 30, height: 30},
        {dest: 'StoreLogo.scale-100.png', width: 50, height: 50},
        {dest: 'SplashScreen.scale-100.png', width: 620, height: 300},
        // scaled images are specified here for backward compatibility only so we can find them by size
        {dest: 'StoreLogo.scale-240.png', width: 120, height: 120},
        {dest: 'Square44x44Logo.scale-100.png', width: 44, height: 44},
        {dest: 'Square44x44Logo.scale-240.png', width: 106, height: 106},
        {dest: 'Square70x70Logo.scale-100.png', width: 70, height: 70},
        {dest: 'Square71x71Logo.scale-100.png', width: 71, height: 71},
        {dest: 'Square71x71Logo.scale-240.png', width: 170, height: 170},
        {dest: 'Square150x150Logo.scale-240.png', width: 360, height: 360},
        {dest: 'Square310x310Logo.scale-100.png', width: 310, height: 310},
        {dest: 'Wide310x150Logo.scale-100.png', width: 310, height: 150},
        {dest: 'Wide310x150Logo.scale-240.png', width: 744, height: 360},
        {dest: 'SplashScreenPhone.scale-240.png', width: 1152, height: 1920}
    ];

    function findPlatformImage(width, height) {
        if (!width && !height){
            // this could be default image, 
            // Windows requires specific image dimension so we can't apply it
            return null;
        }
        for (var idx in platformImages){
            var res = platformImages[idx];
            // If only one of width or height is not specified, use another parameter for comparation
            // If both specified, compare both.
            if ((!width || (width == res.width)) &&
                (!height || (height == res.height))){
                return res;
            }
        }
        return null;
    }

    var images = config.getIcons().concat(config.getSplashScreens());

    images.forEach(function (img) {
        if (img.target) {
            copyMrtImage(img.src, img.target + '.png');
        } else {
            // find target image by size
            var targetImg = findPlatformImage (img.width, img.height);
            if (targetImg) {
                copyImage(img.src, targetImg.dest);
            } else {
                console.log('The following image is skipped due to unsupported size: ' + img.src);
            }
        }
    });
}

function applyBackgroundColor (config, manifest, xmlnsPrefix) {
    var visualElems =null;

    function refineColor(color) {
        // return three-byte hexadecimal number preceded by "#" (required for Windows)
        color = color.replace('0x', '').replace('#', '');
        if (color.length == 3) {
            color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
        }
        // alpha is not supported, so we remove it
        if (color.length == 8) { // AArrggbb
            color = color.slice(2);
        }
        return '#' + color;
    }
    // background color
    var bgColor = config.getPreference('BackgroundColor');
    if (bgColor) {
        var visualElementsName = './/' + xmlnsPrefix + 'VisualElements';
        visualElems = manifest.find(visualElementsName);
        visualElems.attrib.BackgroundColor = refineColor(bgColor);
    }

    // Splash Screen background color
    bgColor = config.getPreference('SplashScreenBackgroundColor');
    if (bgColor) {
        var splashScreenElementsName = './/' + xmlnsPrefix + 'SplashScreen';
        visualElems = manifest.find(splashScreenElementsName);
        visualElems.attrib.BackgroundColor = refineColor(bgColor);
    }
}

function applyUAPVersionToProject(projectFilePath, uapVersionInfo) {
    var fileContents = fs.readFileSync(projectFilePath).toString().trim();
    var xml = et.parse(fileContents);
    var tpv = xml.find('./PropertyGroup/TargetPlatformVersion');
    var tpmv = xml.find('./PropertyGroup/TargetPlatformMinVersion');

    tpv.text = uapVersionInfo.targetUAPVersion.toString();
    tpmv.text = uapVersionInfo.minUAPVersion.toString();

    fs.writeFileSync(projectFilePath, xml.write({ indent: 4 }), {});
}

function applyTargetPlatformVersion(config, manifest, uapVersionInfo) {
    var dependencies = manifest.find('./Dependencies');
    while (dependencies.len() > 0) {
        dependencies.delItem(0);
    }

    var uapVersionSet = getAllMinMaxUAPVersions(config);
    var platformNames = Object.keys(uapVersionSet);
    for (var i = 0; i < platformNames.length; i++) {
        var curTargetPlatformName = platformNames[i];
        var curTargetPlatformInfo = uapVersionSet[curTargetPlatformName];

        var elem = subElement(dependencies, 'TargetDeviceFamily');
        elem.set('Name', curTargetPlatformName);
        elem.set('MinVersion', curTargetPlatformInfo.MinVersion.toString());
        elem.set('MaxVersionTested', curTargetPlatformInfo.MaxVersionTested.toString());
    }
}

// returns {minUAPVersion: Version, targetUAPVersion: Version} | false
function getUAPVersions(config) {
    // @param config: ConfigParser
    var baselineVersions = MSBuildTools.getAvailableUAPVersions();
    if (!baselineVersions || baselineVersions.length === 0) {
        return false;
    }

    baselineVersions.sort(Version.comparer);

    return {
        minUAPVersion: baselineVersions[0],
        targetUAPVersion: baselineVersions[baselineVersions.length - 1]
    };
}

/** 
 * Gets min/max UAP versions from the configuration.  If no version preferences are
 * in the configuration file, this will provide Windows.Universal at BASE_UAP_VERSION for both min and max.
 * This will always return a rational object or will fail; for example, if a platform expects
 * a higher min-version than max-version, it will raise the max version to the min version.
 * 
 * @param config {ConfigParser} The configuration parser
 * @return An object in the shape of: { 'Windows.Mobile': {'MinVersion': Version, 'MaxVersion': Version } } (where Version is a Version object)
 * @exception {RangeError} Thrown if a Version string is badly formed.
 */
function getAllMinMaxUAPVersions(config) {
    var uapVersionPreferenceTest = /(Microsoft.+?|Windows.+?)\-(MinVersion|MaxVersionTested)/i;
    var platformBag = Object.create(null);
    var preferenceList = config.getMatchingPreferences(uapVersionPreferenceTest);
    preferenceList.forEach(function(verPref) {
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
            throw new RangeError('Could not comprehend a valid version from the string "' + verPref.value + '" of platform-boundary "' + verPref.name + '".');
        }

        platformVersionSet[versionPropertyName] = versionTest;
    });

    for (var platformName in platformBag) {
        // Go through each and make sure there are min/max set
        var versionPref = platformBag[platformName];
        if (!versionPref.MaxVersionTested && !!versionPref.MinVersion) { // min is set, but max is not
            versionPref.MaxVersionTested = versionPref.MinVersion;
        }
        else if (!versionPref.MinVersion && !!versionPref.MaxVersionTested) { // max is set, min is not
            versionPref.MinVersion = versionPref.MaxVersionTested;
        }
        else if (!versionPref.MinVersion && !versionPref.MaxVersionTested) { // neither are set
            versionPref.MinVersion = BASE_UAP_VERSION;
            versionPref.MaxVersionTested = BASE_UAP_VERSION;
        } 
        else { // both are set
            if (versionPref.MinVersion.gt(versionPref.MaxVersionTested)) {
                versionPref.MaxVersionTested = versionPref.MinVersion;
            }
        }
    }

    if (Object.keys(platformBag).length === 0) {
        platformBag['Windows.Universal'] = { MinVersion: BASE_UAP_VERSION, MaxVersionTested: BASE_UAP_VERSION };
    }

    return platformBag;
}

/**
 * Checks to see whether access rules or 
 * @param config {ConfigParser} The configuration parser
 * @return {boolean} True if the config specifies remote URIs for access or start; false otherwise.
 */
function checkForRemoteModeUris(config) {
    var accessRules = config.getNavigationWhitelistRules();
    var startPage = config.startPage();
    var test = /(https?|ms-appx-web):\/\//i;

    var hasRemoteUri = test.test(startPage);
    hasRemoteUri = hasRemoteUri || accessRules.some(function(rule) {
        return test.test(rule);
    });

    return hasRemoteUri;
}

/** 
 * Checks for capabilities which are Restricted in Windows 10 UAP.
 * @param appxManifestCapabilitiesElement {ElementTree.Element} The appx manifest element for <capabilities>
 * @return {string[]|false} An array of restricted capability names, or false.
 */
function checkForRestrictedRemoteCapabilityDeclarations(appxManifestCapabilitiesElement) {
    if (!appxManifestCapabilitiesElement)
        return false;

    var hasRestrictedCapabilities = false;
    var foundRestrictedCapabilities = [];

    var children = appxManifestCapabilitiesElement.getchildren();
    var declaredCapabilities = children.map(function(el) {
        return el.attrib.Name;
    });

    UAP_RESTRICTED_CAPS.forEach(function(cap) {
        if (declaredCapabilities.indexOf(cap) > -1) {
            hasRestrictedCapabilities = true;
            foundRestrictedCapabilities.push(cap);
        }
    });

    return hasRestrictedCapabilities ? foundRestrictedCapabilities : hasRestrictedCapabilities;
}

/**
 * Checks for capabilities which require the uap: prefix in Windows 10.
 * @param appxManifestCapabilitiesElement {ElementTree.Element} The appx manifest element for <capabilities>
 */
function ensureUapPrefixedCapabilities(appxManifestCapabilitiesElement) {
    var children = appxManifestCapabilitiesElement.getchildren();
    var declaredCapabilities = children.map(function(el) {
        return { name: el.attrib.Name, element: el, elementName: el.tag };
    });

    declaredCapabilities.forEach(function(cap) {
        if (CAPS_NEEDING_UAPNS.indexOf(cap.name) > -1) {
            if (cap.elementName.indexOf('uap:') === -1) {
                cap.elementName = 'uap:' + cap.elementName;
                cap.element.tag = cap.elementName;
            }
        }
    });
}
