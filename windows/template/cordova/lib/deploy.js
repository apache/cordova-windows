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

var fso = WScript.CreateObject('Scripting.FileSystemObject');
var wscript_shell = WScript.CreateObject("WScript.Shell");

var args = WScript.Arguments;
// working dir
var ROOT = WScript.ScriptFullName.split('\\cordova\\lib\\deploy.js').join('');
// path to WindowsStoreAppUtils.ps1; provides helper functions to install/unistall/start Windows Store app
var WINDOWS_STORE_UTILS = fso.GetAbsolutePathName(ROOT+'\\cordova\\lib\\WindowsStoreAppUtils.ps1');
// path to AppDeploy util from Windows Phone 8.1 SDK
var APP_DEPLOY_UTILS = (wscript_shell.Environment("Process")("ProgramFiles(x86)") ||
        wscript_shell.Environment("Process")("ProgramFiles")) +
        '\\Microsoft SDKs\\Windows Phone\\v8.1\\Tools\\AppDeploy\\AppDeployCmd.exe';
// Check if AppDeployCmd is exists
if (!fso.FileExists(APP_DEPLOY_UTILS)) {
    Log("WARNING: AppDeploy tool (AppDeployCmd.exe) didn't found. Assume that it's in %PATH%");
    APP_DEPLOY_UTILS = "AppDeployCmd";
}

//device_id for targeting specific device
var device_id;

//build types
var NONE = 0,
    DEBUG = 1,
    RELEASE = 2,
    NO_BUILD = 3;
var build_type = NONE;

//deploy types
var NONE = 0,
    EMULATOR = 1,
    DEVICE = 2,
    TARGET = 3;
var deploy_type = NONE;

// project types
var NONE = 0;
    STORE80 = 1;
    STORE81 = 2;
    PHONE = 3;
var project_type = NONE;


var PACKAGE_NAME = '$namespace$';

// help function
function Usage() {
    Log("");
    Log("Usage: run [ --device | --emulator | --target=<id> ] [ --debug | --release | --nobuild ]");
    Log("");
    Log("           [ --x86 | --x64 | --arm ] [--phone | --store | --store81 | --store80]");
    Log("    --device      : Deploys and runs the project on the connected device.");
    Log("    --emulator    : Deploys and runs the project on an emulator.");
    Log("    --target=<id> : Deploys and runs the project on the specified target.");
    Log("    --debug       : Builds project in debug mode.");
    Log("    --release     : Builds project in release mode.");
    Log("    --nobuild     : Uses pre-built xap, or errors if project is not built.");
    Log("    --x86, --x64, --arm");
    Log("                  : Specifies chip architecture.");
    Log("    --phone, --store, --store81, --store80");
    Log("                  : Specifies, what type of project to deploy");
    Log("");
    Log("Examples:");
    Log("    run");
    Log("    run --emulator");
    Log("    run --device");
    Log("    run --target=7988B8C3-3ADE-488d-BA3E-D052AC9DC710");
    Log("    run --device --release");
    Log("    run --emulator --debug");
    Log("");
}

// log to stdout or stderr
function Log(msg, error) {
    if (error) {
        WScript.StdErr.WriteLine(msg);
    }
    else {
        WScript.StdOut.WriteLine(msg);
    }
}

var ForReading = 1, ForWriting = 2, ForAppending = 8;
var TristateUseDefault = 2, TristateTrue = 1, TristateFalse = 0;



// executes a commmand in the shell
function exec(command) {
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status == 0) {
        WScript.sleep(100);
    }
}

// executes a commmand in the shell
function exec_verbose(command) {
    //Log("Command: " + command);
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status == 0) {
        //Wait a little bit so we're not super looping
        WScript.sleep(100);
        //Print any stdout output from the script
        if (!oShell.StdOut.AtEndOfStream) {
            var line = oShell.StdOut.ReadAll();
            Log(line);
        }
    }
    //Check to make sure our scripts did not encounter an error
    if (!oShell.StdErr.AtEndOfStream) {
        var line = oShell.StdErr.ReadAll();
        Log(line, true);
        WScript.Quit(2);
    }
}

// return chip architecture specified in script arguments
// used to select/find appropriate appx package to deploy.
function getChipArchitecture() {
    if (joinArgs().indexOf('--arm') > -1) {
        return 'arm';
    } else if (joinArgs().indexOf('--x86') > -1) {
        return 'x86';
    } else if (joinArgs().indexOf('--x64') > -1) {
        return 'x64';
    }
    return 'anycpu';
}

// returns build type (debug/release) specified in script arguments
// used to select/find appropriate appx package to deploy.
function getBuildType() {
    if (joinArgs().indexOf("--release") > -1) {
        return "release";
    }
    return "debug";
}

// returns project type (phone/store/store80) specified in script arguments
// used to select/find appropriate appx package to deploy.
function getProjectType() {
    var argString = joinArgs();
    if (argString.indexOf("--phone") > -1) {
        return "phone";
    }
    else if (argString.indexOf("--store80") > -1) {
        return "store80";
    }
    // default is 'store' - Windows 8.1 store app
    return "store";
}

// returns folder that contains package with chip architecture,
// build and project types specified by script parameters
function getPackage (path) {
    wscript_shell.CurrentDirectory = path;

    // check if AppPackages created
    if (fso.FolderExists(path + '\\AppPackages')) {
        var out_folder = fso.GetFolder(path + '\\AppPackages');

        // Get preferred chip architecture, build and project types
        var chipArch = getChipArchitecture();
        var buildType = getBuildType();
        var projectType = getProjectType();

        // Iterating over AppPackages subfolders with built packages
        var subFolders = new Enumerator(out_folder.SubFolders);
        for(;!subFolders.atEnd();subFolders.moveNext())
        {
            var subFolder = subFolders.item();
            var appx_props,
                appxProjectType,
                appxChipArch,
                appxBuildType;

            // This RE matches with package folder name like:
            // CordovaApp.Phone_0.0.1.0_AnyCPU_Debug_Test
            // Group:     ( 1 ) (  2  ) (  3 ) ( 4 )
            appx_props = /^.*\.(Phone|Store|Store80)_((?:\d\.)*\d)_(AnyCPU|x64|x86|ARM)(?:_(Debug))?_Test$/.exec(subFolder.Name);
            if (appx_props){
                appxProjectType = appx_props[1].toLowerCase();
                appxChipArch = appx_props[3].toLowerCase();
                appxBuildType = appx_props[4] ? appx_props[4].toLowerCase() : "release";
            }

            // compare chip architecture and build type of package found with
            // chip architecture and build type specified in script arguments
            if (appxChipArch == chipArch && appxBuildType == buildType && appxProjectType == projectType) {
                // Appropriate package found
                Log('Appropriate package found at ' + subFolder.Path);
                return subFolder.Path;
            }
        }
    }
    Log('Error : AppPackages were not built or appropriate package was not found', true);
    WScript.Quit(2);
}

// launches project on local machine
function localMachine(path) {
    Log('Deploying to local machine ...');
    makeAppStoreUtils(path);
    uninstallApp(path);
    installApp(path);

    var command = "powershell -ExecutionPolicy RemoteSigned \". " + WINDOWS_STORE_UTILS + "; Start-Locally '" + PACKAGE_NAME + "'\"";
    Log(command);
    exec_verbose(command);
}

// launches project on device
function device(path) {
    if (project_type != PHONE) {
        // on windows8 platform we treat this command as running application on local machine
        localMachine(path);
    } else {
        Log('Deploying to device ...');
        var appxFolder = getPackage(path);
        var appxPath = appxFolder + '\\' + fso.GetFolder(appxFolder).Name.split('_Test').join('') + '.appx';
        var cmd = '"' + APP_DEPLOY_UTILS + '" /installlaunch "' + appxPath + '" /targetdevice:de';
        Log(cmd);
        exec_verbose(cmd);
    }
}

// launches project on emulator
function emulator(path) {
    if (project_type != PHONE) {
        // TODO: currently we can run application on local machine only
        localMachine(path);
    } else {
        Log('Deploying to emulator ...');
        var appxFolder = getPackage(path);
        var appxPath = appxFolder + '\\' + fso.GetFolder(appxFolder).Name.split('_Test').join('') + '.appx';
        var cmd = '"' + APP_DEPLOY_UTILS + '" /installlaunch "' + appxPath + '" /targetdevice:xd';
        Log(cmd);
        exec_verbose(cmd);
    }
}

// builds and launches the project on the specified target
function target(path) {
    if (project_type != PHONE){
        Log('ERROR: not supported yet', true);
        Log('DEPLOY FAILED.', true);
        WScript.Quit(2);
    } else {
        // We're deploying package on phone device/emulator
        // Let's find target specified by script arguments
        var cmd = APP_DEPLOY_UTILS + ' /enumeratedevices';
        var out = wscript_shell.Exec(cmd);
        while(out.Status === 0) {
            WScript.Sleep(100);
        }
        if (!out.StdErr.AtEndOfStream) {
            var error = out.StdErr.ReadAll();
            Log("ERROR: Error calling AppDeploy : ", true);
            Log(error, true);
            WScript.Quit(2);
        }
        else {
            if (!out.StdOut.AtEndOfStream) {
                // get output from AppDeployCmd
                var lines = out.StdOut.ReadAll().split('\r\n');
                // regular expression, that matches with AppDeploy /enumeratedevices output
                // e.g. ' 1              Emulator 8.1 WVGA 4 inch 512MB'
                var deviceRe = /^\s?(\d)+\s+(.*)$/;
                // iterate over lines
                for (var line in lines){
                    var deviceMatch = lines[line].match(deviceRe);
                    // check that line contains device id and name
                    // and match with 'target' parameter of script
                    if (deviceMatch && deviceMatch[1] == device_id) {
                        // start deploy to target specified
                        var appxFolder = getPackage(path);
                        var appxPath = appxFolder + '\\' + fso.GetFolder(appxFolder).Name.split('_Test').join('') + '.appx';
                        Log('Deploying to target with id: ' + device_id);
                        cmd = '"' + APP_DEPLOY_UTILS + '" /installlaunch "' + appxPath + '" /targetdevice:' + deviceMatch[1];
                        Log(cmd);
                        exec_verbose(cmd);
                        return;
                    }
                }
                Log('Error : target ' + device_id + ' was not found.', true);
                Log('DEPLOY FAILED.', true);
                WScript.Quit(2);
            }
            else {
                Log('Error : CordovaDeploy Failed to find any devices', true);
                Log('DEPLOY FAILED.', true);
                WScript.Quit(2);
            }
        }
    }
}

function makeAppStoreUtils(path) {
    if (fso.FileExists(WINDOWS_STORE_UTILS)) {
        Log("Removing execution restrictions from AppStoreUtils...");
        var command = "powershell \"Unblock-File \'" + WINDOWS_STORE_UTILS + "\'\"";
        exec_verbose(command);
        return;
    }
}

// uninstalls previous application instance (if exists)
function uninstallApp(path) {
    Log("Attempt to uninstall previous application version...");
    Log("\tDirectory : " + path);

    wscript_shell.CurrentDirectory = path;
    var command = "powershell -ExecutionPolicy RemoteSigned \". " + WINDOWS_STORE_UTILS + "; Uninstall-App " + PACKAGE_NAME;
    Log(command);
    exec_verbose(command);
}

// executes store application installation script (Add-AppDevPackage.ps1)
function installApp(path) {

    Log("Attempt to install application...");
    Log("\tDirectory : " + path);

    var command = "powershell -ExecutionPolicy RemoteSigned \". " + WINDOWS_STORE_UTILS + "; Install-App " + "'" + getPackage(path) + "\\Add-AppDevPackage.ps1" + "'\"";
    Log(command);
    exec_verbose(command);
    return;
}

// builds project with arguments specified
// all arguments passes directly into build script without changes
function build(path) {

    switch (build_type) {
        // debug & release configurations are specified 
        case DEBUG :
        case RELEASE :
            exec_verbose('%comspec% /c "' + ROOT + '\\cordova\\build" ' + joinArgs());
            break;
        case NO_BUILD :
            break;
        case NONE :
            Log("WARNING: [ --debug | --release | --nobuild ] not specified, defaulting to --debug.");
            exec_verbose('%comspec% /c "' + ROOT + '\\cordova\\build" ' + joinArgs());
            break;
        default :
            Log("Build option not recognized: " + build_type, true);
            WScript.Quit(2);
            break;
    }
}

function run(path) {
    switch(deploy_type) {
        case EMULATOR :
            build(path);
            emulator(path);
            break;
        case DEVICE :
            build(path);
            device(path);
            break;
        case TARGET :
            build(path);
            target(path);
            break;
        case NONE :
            Log("WARNING: [ --target=<ID> | --emulator | --device ] not specified, defaulting to --emulator");
            build(path);
            emulator(path);
            break;
        default :
            Log("Deploy option not recognized: " + deploy_type, true);
            WScript.Quit(2);
            break;
    }
}

// returns script arguments, joined into string
function joinArgs () {
    var argArray = [];
    for (var i = 0; i < args.Length; i++) {
        argArray[i] = args.Item(i);
    }
    return argArray.join(" ");
}

// parses script arguments and sets script's build_type/deploy_type variables
function parseArgs () {

    // support help flags
    if (args(0) == "--help" || args(0) == "/?" ||
            args(0) == "help" || args(0) == "-help" || args(0) == "/help") {
        Usage();
        WScript.Quit(2);
    }

    var argString = joinArgs();

    // Check for build type
    if (argString.indexOf('--release') > -1){
        build_type = RELEASE;
    } else if (argString.indexOf('--debug') > -1) {
        build_type = DEBUG;
    } else if (argString.indexOf('--nobuild') > -1) {
        build_type = NO_BUILD;
    }

    // Check for deploy destination
    if (argString.indexOf("--emulator") > -1 || argString.indexOf("-e") > -1) {
        deploy_type = EMULATOR;
    }
    else if (argString.indexOf("--device") > -1 || argString.indexOf("-d") > -1) {
        deploy_type = DEVICE;
    }
    else if (argString.indexOf("--target=") > -1) {
        device_id = argString.split("--target=")[1].split(' ')[0];
        deploy_type = TARGET;
    }

    // Check for project type
    if (argString.indexOf("--phone") > -1) {
        project_type = PHONE;
    }
    else if (argString.indexOf("--store80") > -1) {
        project_type = STORE80;
    }
    else if (argString.indexOf("--store") > -1 || argString.indexOf("--store81") > -1) {
        project_type = STORE81;
    }
}

// check root folder exists
if (!fso.FolderExists(ROOT)) {
    Log('Error: Project directory not found,', true);
    Usage();
    WScript.Quit(2);
}

if (args.Count() > 0) {

    // parse arguments
    parseArgs();
}

run(ROOT);