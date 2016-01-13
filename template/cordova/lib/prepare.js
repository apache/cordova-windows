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

var Q = require('q');
var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
var et = require('elementtree');
var Version = require('./Version');
var AppxManifest = require('./AppxManifest');
var MSBuildTools = require('./MSBuildTools');
var ConfigParser = require('./ConfigParser');
var events = require('cordova-common').events;
var xmlHelpers = require('cordova-common').xmlHelpers;

var PROJECT_WINDOWS10   = 'CordovaApp.Windows10.jsproj',
    MANIFEST_WINDOWS8   = 'package.windows80.appxmanifest',
    MANIFEST_WINDOWS    = 'package.windows.appxmanifest',
    MANIFEST_PHONE      = 'package.phone.appxmanifest',
    MANIFEST_WINDOWS10  = 'package.windows10.appxmanifest';

var TEMPLATE =
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<!--\n    This file is automatically generated.\n' +
    '    Do not modify this file - YOUR CHANGES WILL BE ERASED!\n-->\n';

/** Note: this is only for backward compatibility, since it is being called directly from windows_parser */
module.exports.applyPlatformConfig = function() {
    var projectRoot = path.join(__dirname, '../..');
    var appConfig = new ConfigParser(path.join(projectRoot, '../../config.xml'));
    updateProjectAccordingTo(appConfig);
    copyImages(appConfig, projectRoot);
};

module.exports.updateBuildConfig = function(buildConfig) {
    var projectRoot = path.join(__dirname, '../..');
    var config = new ConfigParser(path.join(projectRoot, 'config.xml'));

    // if no buildConfig is provided dont do anything
    buildConfig = buildConfig || {};

    // Merge buildConfig with config
    for (var attr in buildConfig) {
        config[attr] = buildConfig[attr];
    }

    var root = new et.Element('Project');
    root.set('xmlns', 'http://schemas.microsoft.com/developer/msbuild/2003');
    var buildConfigXML =  new et.ElementTree(root);
    var propertyGroup = new et.Element('PropertyGroup');
    var itemGroup = new et.Element('ItemGroup');

    // Append PropertyGroup and ItemGroup
    buildConfigXML.getroot().append(propertyGroup);
    buildConfigXML.getroot().append(itemGroup);

    // packageCertificateKeyFile - defaults to 'CordovaApp_TemporaryKey.pfx'
    var packageCertificateKeyFile = config.packageCertificateKeyFile || 'CordovaApp_TemporaryKey.pfx';

    if (config.packageCertificateKeyFile) {
        // Convert packageCertificateKeyFile from absolute to relative path
        packageCertificateKeyFile = path.relative(projectRoot, packageCertificateKeyFile);
    }

    var certificatePropertyElement = new et.Element('PackageCertificateKeyFile');
    certificatePropertyElement.text = packageCertificateKeyFile;
    propertyGroup.append(certificatePropertyElement);

    var certificateItemElement = new et.Element('None', { 'Include': packageCertificateKeyFile });
    itemGroup.append(certificateItemElement);

    // packageThumbprint
    if (config.packageThumbprint) {
        var thumbprintElement = new et.Element('PackageCertificateThumbprint');
        thumbprintElement.text = config.packageThumbprint;
        propertyGroup.append(thumbprintElement);
    }

    // DefaultLanguage - defaults to 'en-US'
    var defaultLocale = config.defaultLocale() || 'en-US';
    var defaultLocaleElement = new et.Element('DefaultLanguage');
    defaultLocaleElement.text = defaultLocale;
    propertyGroup.append(defaultLocaleElement);

    var buildConfigFileName = buildConfig.buildType === 'release' ?
        path.join(projectRoot, 'CordovaAppRelease.projitems') :
        path.join(projectRoot, 'CordovaAppDebug.projitems');

    fs.writeFileSync(buildConfigFileName, TEMPLATE + buildConfigXML.write({indent: 2, xml_declaration: false}), 'utf-8');
};

function updateManifestFile (config, manifestPath) {
    var manifest = AppxManifest.get(manifestPath);
    // Break out Windows 10-specific functionality because we also need to
    // apply UAP versioning to Windows 10 appx-manifests.
    var isTargetingWin10 = manifest.prefix === 'uap:';

    applyCoreProperties(config, manifest);
    applyStartPage(config, manifest, isTargetingWin10);

    if (isTargetingWin10) {
        applyNavigationWhitelist(config, manifest);
    } else {
        applyAccessRules(config, manifest);
    }

    // Apply background color, splashscreen background color, etc.
    manifest.getVisualElements()
        .trySetBackgroundColor(config.getPreference('BackgroundColor'))
        .setSplashBackgroundColor(config.getPreference('SplashScreenBackgroundColor'))
        .setToastCapable(config.getPreference('WindowsToastCapable'))
        .setOrientation(config.getPreference('Orientation'));

    if (isTargetingWin10) {
        manifest.setDependencies(config.getAllMinMaxUAPVersions());

        var badCaps = manifest.getRestrictedCapabilities();
        if (config.hasRemoteUris() && badCaps) {
            events.emit('warn', 'The following Capabilities were declared and are restricted:' +
                '\n\t' + badCaps.map(function(a){return a.name;}).join(', ') +
                '\nYou will be unable to on-board your app to the public Windows Store with these ' +
                'capabilities and access rules permitting access to remote URIs.');
        }
    }

    //Write out manifest
    manifest.write();
}

function applyCoreProperties(config, manifest) {
    // CB-9450: iOS/Android and Windows Store have an incompatibility here; Windows Store assigns the
    // package name that should be used for upload to the store.  However, this can't be set for typical
    // Cordova apps.  So, we have to create a Windows-specific preference here.
    var pkgName = config.getPreference('WindowsStoreIdentityName') || config.packageName();
    if (pkgName) {
        manifest.getIdentity().setName(pkgName);
    }

    var version = config.windows_packageVersion() || config.version();
    if (version) {
        manifest.getIdentity().setVersion(version);
    }

    // Update publisher id (identity)
    if (config.publisherId) {
        manifest.getIdentity().setPublisher(config.publisherId);
    }

    // Update name (windows8 has it in the Application[@Id] and Application.VisualElements[@DisplayName])
    var baselinePackageName = config.packageName();
    if (baselinePackageName) {
        manifest.getApplication().setId(baselinePackageName);
    }

    var name = config.name();
    if (name) {
        manifest.getVisualElements().setDisplayName(name);
    }

    // CB-9410: Get a display name and publisher display name.  In the Windows Store, certain
    // strings which are typically used in Cordova aren't valid for Store ingestion.
    // Here, we check for Windows-specific preferences, and if we find it, prefer that over
    // the Cordova <widget> areas.
    var displayName = config.getPreference('WindowsStoreDisplayName') || name;
    var publisherName = config.getPreference('WindowsStorePublisherName') || config.author();

    // Update properties
    manifest.getProperties()
        .setDisplayName(displayName)
        .setPublisherDisplayName(publisherName);
}

function applyStartPage(config, manifest, targetingWin10) {
    // If not specified, set default value
    // http://cordova.apache.org/docs/en/edge/config_ref_index.md.html#The%20config.xml%20File
    var startPage = config.startPage() || 'index.html';

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

    manifest.getApplication().setStartPage(uriPrefix + startPagePrefix + startPage);
}

function applyAccessRules (config, manifest) {
    var accessRules = config.getAccesses()
    .filter(function(rule) {
        // https:// rules are always good, * rules are always good
        if (rule.origin.indexOf('https://') === 0 || rule.origin === '*') return true;

        events.emit('warn', 'Access rules must begin with "https://", the following rule will be ignored: ' + rule.origin);
        return false;
    }).map(function (rule) {
        return rule.origin;
    });

    // If * is specified, emit no access rules.
    if (accessRules.indexOf('*') > -1) {
        accessRules = [];
    }

    manifest.getApplication().setAccessRules(accessRules);
}

/**
 * Windows 10-based whitelist-plugin-compatible support for the enhanced navigation whitelist.
 * Allows WinRT access to origins specified by <allow-navigation href="origin" /> elements.
 */
function applyNavigationWhitelist(config, manifest) {

    if (manifest.prefix !== 'uap:') {
        // This never should happen, but to be sure let's check
        throw new Error('AllowNavigation whitelist rules must be applied to Windows 10 appxmanifest only.');
    }

    var UriSchemeTest = /^(?:https?|ms-appx-web):\/\//i;

    var whitelistRules = config.getAllowNavigations()
    .filter(function(rule) {
        if (UriSchemeTest.test(rule.href)) return true;

        events.emit('warn', 'The following navigation rule had an invalid URI scheme and is ignored: "' + rule.href + '".');
        return false;
    })
    .map(function (rule) {
        return rule.href;
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

    manifest.getApplication().setAccessRules(whitelistRules);
}

function copyImages(config, platformRoot) {

    var appRoot = path.dirname(config.path);

    function copyImage(src, dest) {
        src = path.join(appRoot, src);
        dest = path.join(platformRoot, 'images', dest);
        events.emit('verbose', 'Copying image from ' + src + ' to ' + dest);
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
            events.emit('warn', 'No images found for target: ' + destFileName);
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

    var images = config.getIcons('windows').concat(config.getSplashScreens('windows'));

    images.forEach(function (img) {
        if (img.target) {
            copyMrtImage(img.src, img.target + '.png');
        } else {
            // find target image by size
            var targetImg = findPlatformImage (img.width, img.height);
            if (targetImg) {
                copyImage(img.src, targetImg.dest);
            } else {
                events.emit('warn', 'The following image is skipped due to unsupported size: ' + img.src);
            }
        }
    });
}

function applyUAPVersionToProject(projectFilePath, uapVersionInfo) {
    // No uapVersionInfo means that there is no UAP SDKs installed and there is nothing to do for us
    if (!uapVersionInfo) return;

    var fileContents = fs.readFileSync(projectFilePath).toString().trim();
    var xml = et.parse(fileContents);
    var tpv = xml.find('./PropertyGroup/TargetPlatformVersion');
    var tpmv = xml.find('./PropertyGroup/TargetPlatformMinVersion');

    tpv.text = uapVersionInfo.targetUAPVersion.toString();
    tpmv.text = uapVersionInfo.minUAPVersion.toString();

    fs.writeFileSync(projectFilePath, xml.write({ indent: 4 }), {});
}

// returns {minUAPVersion: Version, targetUAPVersion: Version} | false
function getUAPVersions() {
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

module.exports.prepare = function (cordovaProject) {
    var self = this;

    this._config = updateConfigFilesFrom(cordovaProject.projectConfig,
        this._munger, this.locations);

    // Update own www dir with project's www assets and plugins' assets and js-files
    return Q.when(updateWwwFrom(cordovaProject, this.locations))
    .then(function () {
        // update project according to config.xml changes.
        return updateProjectAccordingTo(self._config, self.locations);
    })
    .then(function () {
        copyImages(cordovaProject.projectConfig, self.root);
    })
    .then(function () {
        self.events.emit('verbose', 'Updated project successfully');
    });
};

/**
 * Adds BOM signature at the beginning of all js|html|css|json files in
 *   specified folder and all subfolders. This is required for application to
 *   pass Windows store certification successfully.
 *
 * @param  {String}  directory  Directory where we need to update files
 */
function addBOMSignature(directory) {
    shell.ls('-R', directory)
    .forEach(function (file) {
        if (!file.match(/\.(js|html|css|json)$/i)) {
            return;
        }

        var filePath = path.join(directory, file);
        // skip if this is a folder
        if (!fs.lstatSync(filePath).isFile()) {
            return;
        }

        var content = fs.readFileSync(filePath);
        if (content[0] !== 0xEF && content[1] !== 0xBE && content[2] !== 0xBB) {
            fs.writeFileSync(filePath, '\ufeff' + content);
        }
    });
}

module.exports.addBOMSignature = addBOMSignature;

/**
 * Updates config files in project based on app's config.xml and config munge,
 *   generated by plugins.
 *
 * @param   {ConfigParser}   sourceConfig  A project's configuration that will
 *   be merged into platform's config.xml
 * @param   {ConfigChanges}  configMunger  An initialized ConfigChanges instance
 *   for this platform.
 * @param   {Object}         locations     A map of locations for this platform
 *
 * @return  {ConfigParser}                 An instance of ConfigParser, that
 *   represents current project's configuration. When returned, the
 *   configuration is already dumped to appropriate config.xml file.
 */
function updateConfigFilesFrom(sourceConfig, configMunger, locations) {
    // First cleanup current config and merge project's one into own
    var defaultConfig = locations.defaultConfigXml;
    var ownConfig = locations.configXml;
    var sourceCfg = sourceConfig.path;
    // If defaults.xml is present, overwrite platform config.xml with it.
    // Otherwise save whatever is there as defaults so it can be
    // restored or copy project config into platform if none exists.
    if (fs.existsSync(defaultConfig)) {
        events.emit('verbose', 'Generating config.xml from defaults for platform "windows"');
        shell.cp('-f', defaultConfig, ownConfig);
    } else if (fs.existsSync(ownConfig)) {
        shell.cp('-f', ownConfig, defaultConfig);
    } else {
        shell.cp('-f', sourceCfg, ownConfig);
    }

    // Then apply config changes from global munge to all config files
    // in project (including project's config)
    configMunger.reapply_global_munge().save_all();

    // Merge changes from app's config.xml into platform's one
    var config = new ConfigParser(ownConfig);
    xmlHelpers.mergeXml(sourceConfig.doc.getroot(),
        config.doc.getroot(), 'windows', /*clobber=*/true);
    // CB-6976 Windows Universal Apps. For smooth transition and to prevent mass api failures
    // we allow using windows8 tag for new windows platform
    xmlHelpers.mergeXml(sourceConfig.doc.getroot(),
        config.doc.getroot(), 'windows8', /*clobber=*/true);

    config.write();
    return config;
}

/**
 * Updates platform 'www' directory by replacing it with contents of
 *   'platform_www' and app www. Also copies project's overrides' folder into
 *   the platform 'www' folder
 *
 * @param   {Object}  cordovaProject    An object which describes cordova project.
 * @param   {Object}  destinations      An object that contains destination
 *   paths for www files.
 */
function updateWwwFrom(cordovaProject, destinations) {

    shell.rm('-rf', destinations.www);
    shell.mkdir('-p', destinations.www);
    // Copy source files from project's www directory
    shell.cp('-rf', path.join(cordovaProject.locations.www, '*'), destinations.www);
    // Override www sources by files in 'platform_www' directory
    shell.cp('-rf', path.join(destinations.platformWww, '*'), destinations.www);

    // If project contains 'merges' for our platform, use them as another overrides
    // CB-6976 Windows Universal Apps. For smooth transition from 'windows8' platform
    // we allow using 'windows8' merges for new 'windows' platform
    ['windows8', 'windows'].forEach(function (platform) {
        var mergesPath = path.join(cordovaProject.root, 'merges', platform);
        // if no 'merges' directory found, no further actions needed
        if (!fs.existsSync(mergesPath)) return;

        events.emit('verbose', 'Found "merges" for ' + platform + ' platform. Copying over existing "www" files.');
        var overrides = path.join(mergesPath, '*');
        shell.cp('-rf', overrides, destinations.www);
    });
}

/**
 * Updates project structure and AppxManifest according to project's configuration.
 *
 * @param   {ConfigParser}  projectConfig  A project's configuration that will
 *   be used to update project
 * @param   {Object}  locations       A map of locations for this platform
 */
function updateProjectAccordingTo(projectConfig, locations) {
    // Apply appxmanifest changes
    [MANIFEST_WINDOWS, MANIFEST_WINDOWS8, MANIFEST_WINDOWS10, MANIFEST_PHONE]
    .forEach(function(manifestFile) {
        updateManifestFile(projectConfig, path.join(locations.root, manifestFile));
    });

    if (process.platform === 'win32') {
        applyUAPVersionToProject(path.join(locations.root, PROJECT_WINDOWS10), getUAPVersions());
    }
}
