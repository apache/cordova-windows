Release Notes for Cordova-Windows

Update these notes using: git log --pretty=format:'* %s' --topo-order --no-merges *remote*/3.5.x...HEAD

cordova-windows is a library that enables developers to create Windows 8/8.1 and WP8.1 application projects that support Cordova APIs.

* updated version to 3.7.0-dev on master
* merged package.json changes
* update release notes

[3.6.4]
* Set VERSION to 3.6.4 (via coho)
* Update JS snapshot to version 3.6.4 (via coho)
* CB-7617 partial match support for --target
* CB-7617 Deploy on WP8.1 incorrectly handles --target name
* bundledDependencies + fixed some whitespace

[3.6.0]
* CB-7377 Removes unnecessary rules tracing which is also incorrectly handled by PS
* update cordova.js
* Removed un-needed files, multiple cordova.js files can only cause confusion
* CB-7377 Whitelist. Windows build error due to 'invalid URI rules in config.xml'
* CB-7333 Makes default platform template files overridable
* Add appveyor badge
* CB-7129 VS2012 solution now accepts "anycpu" target instead of "any cpu"
* CB-7129 Fixes issue when project isn't built if msbuild v12.0 is not found.
* updated repo README
* updated repo README
* add appveyor file for ci
* add basic npm test of create+build project
* ignore node_modules
* CB-6976 Reflect new switch name to project structure
* CB-6976 Changes switch name from '--store' to '--win'
* Moves node_modules to bin to correctly work under npm
* Adds missing ExecutionPolicy option for powershell
* Configurable target version for store and phone targets.
* CB-7129 spellcheck
* Rewrite tooling/platform scripts from WSH to NodeJS
* CB-7243 VERSION file is copied over in create platform script.
* Using wildcard ** glob to include www folder items CB-6699 #32 #10
* CB-7144 Windows8 run fails if replace default certificate
* CB-6787 Windows8 - Fix header licenses (Apache RAT report)
* updated cordova.js
* CB-6976 support for new splash screen and icon images
* fixes potential perf issue inside exec_verbose method
* CB-6976 fixes deploy error when --nobuild option specified
* CB-6976 replaces new template icons and splash screens
* CB-6976 fixes deploy error on WP8.1 emulator
* CB-6976 fixes run/emulate error when it runs for the first time
* CB-6976 fixes deploy when target type is not specified
* Adds support for build archs to run command  + small cleanup and refactoring  + fix jshint issues
* CB-6976 Add support for Windows Universal apps (Windows 8.1 and WP 8.1)
* Cleanup. This closes #10
* Removed Windows7 which is now in it's own branch. This closes #29
* Added list of supported architectures in help text
* Adds support for target architectures to build command
* Closing merged pull requests. close #31, close #30
* Close stale pull-reqs, close #22, close #21, close #19
* CB-6686 [3.5.0rc][Windows8] Build  error if path contains whitespaces
* CB-6684 [3.5.0rc][Windows8] Splash screen setting breaks the build
* CB-6787 Add license to windows8/CONTRIBUTING.md
* CB-6684 [3.5.0rc][Windows8] Splash screen setting breaks the build
* CB-6686 [3.5.0rc][Windows8] Build  error if path contains whitespaces


[3.5.0]

* CB-6557: added pacakge.json to windows8
* CB-6491 add CONTRIBUTING.md
* CB-6309 Windows8. Add Splash Screen img support via config.xml preference, CB-6544 SplashScreenBackgroundColor, CB-6545 support multiple preferences
* moved PlatformConfig functionality to pre-build project level so running outside of cli will still work
* Fix for when background-color and/or content-src aren't specified in config.xml
* Background color now applied to windows 8 project config during build process. * Added logic to convert hexadecimal color to windows 8 specific format
* Fix build/deploy errors when path to project contains spaces
* Version files updated to 3.5.0-dev
* CB-6435 ./VERSION & /template/VERSION updated
* Modify execution policy restrictions removal logic. Using PS native cmdlet to remove restrictions.
* CB-6397 [windows8] Use the latest version of MSBuild Tools installed to build the app
* CB-6256 CB-6266 Add support for domain whitelist and start page settings to Windows8
* CB-2970 CB-2953 log unsupported methods and exit with code 1
* CB-2978 list-devices not supported on windows 8
* CB-6091 [windows] Build fails if application path contains whitespaces
* CB-6083 [windows8] Use registry to read msbuild tools path
* CB-6042 [windows8] Cordova emulate fails if no developer certificate is installed
* CB-5951 Added namespace to config.xml
* Remove template file after create by name
* CB-4533 return error code 2 on fail, CB-5359 get tools version from the registry
* update to 3.4.0 js and increment version num
* CB-5951 Added namespace to config.xml
* Remove template file after create by name
* CB-4533 return error code 2 on fail, CB-5359 get tools version from the registry
* update cordova-js and VERSION
