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

var path  = require('path'),
    fs  = require('fs'),
    et = require('elementtree'),
    shell = require('shelljs'),
    ConfigParser = require('./ConfigParser');

var ROOT = path.join(__dirname, '..', '..'),
    accessRules;

module.exports.applyPlatformConfig = function () {
    console.log('Applying Platform Config...');

    var config = new ConfigParser(path.join(ROOT, 'config.xml'));

    accessRules = config.getAccessRules().filter(function(rule) {
        if (rule.indexOf('https://') == 0 || rule == '*') {
            return true;
        } else {
            console.log('Access rules must begin with "https://", the following rule will be ignored: ' + rule);
        }
        return false;
    });

    ['package.windows.appxmanifest', 'package.windows80.appxmanifest', 'package.phone.appxmanifest'].forEach(
        function(manifestFile) {
            updateManifestFile(config, path.join(ROOT, manifestFile));
    })

    copyImages(config);
}

function updateManifestFile (config, manifestPath) {

    var contents = fs.readFileSync(manifestPath, 'utf-8');
    if(contents) {
        //Windows is the BOM. Skip the Byte Order Mark.
        contents = contents.substring(contents.indexOf('<'));
    };

    var manifest =  new et.ElementTree(et.XML(contents));

    applyCoreProperties(config, manifest);
    // sort Capability elements as per CB-5350 Windows8 build fails due to invalid 'Capabilities' definition
    sortCapabilities(manifest);
    applyAccessRules(config, manifest);
    applyBackgroundColor(config, manifest);

    //Write out manifest
    fs.writeFileSync(manifestPath, manifest.write({indent: 4}), 'utf-8');
}

function applyCoreProperties(config, manifest) {
    var version = fixConfigVersion(config.version());
    var name = config.name();
    var pkgName = config.packageName();
    var author = config.author();
    var startPage = config.startPage();

    if (!startPage) {
        // If not specified, set default value
        // http://cordova.apache.org/docs/en/edge/config_ref_index.md.html#The%20config.xml%20File
        startPage = "index.html";
    }

    var identityNode = manifest.find('.//Identity');
    if(!identityNode) {
        throw new Error('Invalid manifest file (no <Identity> node): ' + manifestPath);
    }
    // Update identity name and version
    pkgName && (identityNode.attrib.Name = pkgName);
    version && (identityNode.attrib.Version = version);

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
    app.attrib.StartPage = 'www/' + startPage;

    var visualElems = manifest.find('.//VisualElements') // windows 8.0
        || manifest.find('.//m2:VisualElements') // windows 8.1
        || manifest.find('.//m3:VisualElements'); // windows phone 8.1

    if(!visualElems) {
        throw new Error('Invalid manifest file (no <VisualElements> node): ' + manifestPath);
    }
    name && (visualElems.attrib.DisplayName = name);

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

function applyAccessRules (config, manifest) {
    // Updates WhiteListing rules
    //<ApplicationContentUriRules>
    //    <Rule Match="https://www.example.com" Type="include"/>
    //</ApplicationContentUriRules>
    var appUriRulesRoot = manifest.find('.//Application'),
        appUriRules = appUriRulesRoot.find('.//ApplicationContentUriRules');

    if (appUriRules != null) {
        appUriRulesRoot.remove(null, appUriRules);
    }
    // rules are not defined or allow any
    if (accessRules.length == 0 || accessRules.indexOf('*') > -1) {
        return;
    } 

    appUriRules = et.Element('ApplicationContentUriRules');
    appUriRulesRoot.append(appUriRules);

    accessRules.forEach(function(rule) {
        var el = et.Element('Rule')
        el.attrib.Match = rule;
        el.attrib.Type = 'include';
        appUriRules.append(el);
    });
}

function sortCapabilities(manifest) {
    var capabilitiesRoot = manifest.find('.//Capabilities'),
        capabilities = capabilitiesRoot._children || [];
    // to sort elements we remove them and then add again in the appropriate order
    capabilities.forEach(function(elem) { // no .clear() method
        capabilitiesRoot.remove(0, elem);
    });
    capabilities.sort(function(a, b) {
        return (a.tag > b.tag) ? 1: -1;
    });
    capabilities.forEach(function(elem){
        capabilitiesRoot.append(elem);
    });
}

function copyImages(config) {
    var platformRoot = ROOT;
    // TODO find the way to detect whether command was triggered by CLI or not
    var appRoot = path.join(platformRoot, '..', '..');

    function copyImage(src, dest) {
        src = path.join(appRoot, src),
        dest = path.join(platformRoot, dest);
        console.log('Copying image from ' + src + ' to ' + dest);
        shell.cp('-f', src, dest);
    }

    // Icons, supported by the platform
    var platformIcons = [
        {dest: 'images/logo.png', width: 150, height: 150},
        {dest: 'images/smalllogo.png', width: 30, height: 30},
        {dest: 'images/storelogo.png', width: 50, height: 50},
        {dest: 'images/StoreLogo.scale-240.png', width: 120, height: 120},
        {dest: 'images/Square44x44Logo.scale-240.png', width: 106, height: 106},
        {dest: 'images/Square71x71Logo.scale-240.png', width: 170, height: 170},
        {dest: 'images/Square150x150Logo.scale-240.png', width: 360, height: 360},
        {dest: 'images/Wide310x150Logo.scale-240.png', width: 744, height: 360},
    ];

    var icons = config.getIcons();
    platformIcons.forEach(function (item) {
        var img = icons.getBySize(item.width, item.height);
        if (img) {
            copyImage(img.src, item.dest);
        }
    });

    // Splash screen images, supported by the platform
    var platformSplashImages = [
        {dest: 'images/splashscreen.png', width: 620, height: 300},
        {dest: 'images/SplashScreen.scale-240.png', width: 1152, height: 1920}
    ];

    var splashImages = config.getSplashScreens();

    platformSplashImages.forEach(function (item) {
        var img = splashImages.getBySize(item.width, item.height);
        if (img) {
            copyImage(img.src, item.dest);
        }
    });
}

function applyBackgroundColor (config, manifest) {

    function refineColor(color) {
        // return three-byte hexadecimal number preceded by "#" (required for Windows)
        color = color.replace('0x', '').replace('#', '');
        if (color.length == 3) {
            color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
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
        var visualElems = manifest.find('.//VisualElements') // windows 8.0
            || manifest.find('.//m2:VisualElements') // windows 8.1
            || manifest.find('.//m3:VisualElements'); // windows phone 8.1
        visualElems.attrib.BackgroundColor = refineColor(bgColor);
    }

    // Splash Screen background color
    bgColor = config.getPreference('SplashScreenBackgroundColor');
    if (bgColor) {
        var visualElems = manifest.find('.//SplashScreen') // windows 8.0
            || manifest.find('.//m2:SplashScreen') // windows 8.1
            || manifest.find('.//m3:SplashScreen'); // windows phone 8.1
        visualElems.attrib.BackgroundColor = refineColor(bgColor);
    }
}