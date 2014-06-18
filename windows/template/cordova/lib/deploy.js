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

// build type. Possible values: "debug", "release"
// required to determine which package should be deployed
var buildType = null,
    // nobuild flag
    noBuild = false,
    // list of build architectures. list of strings
    // required to determine which package should be deployed
    buildArchs = null,
    // build target. Possible values: "device", "emulator", "<target_name>"
    buildTarget = null,
    // project type. Possible values are "phone", "store" == "store81", "store80"
    projectType = null;


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

// executes a commmand in the shell
function exec(command) {
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status === 0) {
        WScript.sleep(100);
    }
}

// executes a commmand in the shell
function exec_verbose(command) {
    //Log("Command: " + command);
    var oShell=wscript_shell.Exec(command),
        line;
    while (oShell.Status === 0) {
        //Wait a little bit so we're not super looping
        WScript.sleep(100);
        //Print any stdout output from the script
        if (!oShell.StdOut.AtEndOfStream) {
            line = oShell.StdOut.ReadAll();
            Log(line);
        }
    }
    //Check to make sure our scripts did not encounter an error
    if (!oShell.StdErr.AtEndOfStream) {
        line = oShell.StdErr.ReadAll();
        Log(line, true);
        WScript.Quit(2);
    }
}

// returns folder that contains package with chip architecture,
// build and project types specified by script parameters
function getPackage (path, projecttype, buildtype, buildarchs) {
    wscript_shell.CurrentDirectory = path;

    // check if AppPackages created
    if (fso.FolderExists(path + '\\AppPackages')) {
        var out_folder = fso.GetFolder(path + '\\AppPackages');

        // set default values
        // because "store81" and "store" are synonims, replace "store81" with "store" due to appx naming.
        projecttype = projecttype != "store81" ? projecttype : "store";
        buildtype = buildtype ? buildtype : "debug";
        buildarchs = buildarchs ? buildarchs : ["anycpu"];
        // if "Any CPU" is arch to deploy, remove space because folder name will contain
        // smth like CordovaApp_0.0.1.0_AnyCPU_Test
        var buildarch = buildarchs[0].toLowerCase() == "any cpu" ? "anycpu" : buildarchs[0].toLowerCase();

        // Iterating over AppPackages subfolders with built packages
        var subFolders = new Enumerator(out_folder.SubFolders);
        for(;!subFolders.atEnd();subFolders.moveNext())
        {
            var subFolder = subFolders.item();
            var appx_props = /^.*\.(Phone|Store|Store80)_((?:\d\.)*\d)_(AnyCPU|x64|x86|ARM)(?:_(Debug))?_Test$/.exec(subFolder.Name);
            // This RE matches with package folder name like:
            // CordovaApp.Phone_0.0.1.0_AnyCPU_Debug_Test
            // Group:     ( 1 ) (  2  ) (  3 ) ( 4 )
            if (appx_props){
                var appx_projecttype = appx_props[1].toLowerCase();
                var appx_buildarch = appx_props[3].toLowerCase();
                var appx_buildtype = appx_props[4] ? appx_props[4].toLowerCase() : "release";
                // compare chip architecture and build type of package found with
                // chip architecture and build type specified in script arguments
                if (appx_buildarch == buildarch && appx_buildtype == buildType && appx_projecttype == projecttype) {
                    // Appropriate package found
                    Log('Appropriate package found at ' + subFolder.Path);
                    return subFolder.Path;
                }
            }
        }
    }
    Log('Error : AppPackages were not built or appropriate package was not found', true);
    WScript.Quit(2);
}

// launches project on local machine
function localMachine(path, projecttype, buildtype, buildarchs) {
    Log('Deploying to local machine ...');
    makeAppStoreUtils(path);
    uninstallApp(path);
    installApp(path, projecttype, buildtype, buildarchs);

    var command = "powershell -ExecutionPolicy RemoteSigned \". " + WINDOWS_STORE_UTILS + "; Start-Locally '" + PACKAGE_NAME + "'\"";
    Log(command);
    exec_verbose(command);
}

// launches project on device
function device(path, projecttype, buildtype, buildarchs) {
    if (projecttype != "phone") {
        // on windows8 platform we treat this command as running application on local machine
        localMachine(path, projecttype, buildtype, buildarchs);
    } else {
        Log('Deploying to device ...');
        var appxFolder = getPackage(path, projecttype, buildtype, buildarchs);
        var appxPath = appxFolder + '\\' + fso.GetFolder(appxFolder).Name.split('_Test').join('') + '.appx';
        var cmd = '"' + APP_DEPLOY_UTILS + '" /installlaunch "' + appxPath + '" /targetdevice:de';
        Log(cmd);
        exec_verbose(cmd);
    }
}

// launches project on emulator
function emulator(path, projecttype, buildtype, buildarchs) {
    if (projecttype != "phone") {
        // TODO: currently we can run application on local machine only
        localMachine(path, projecttype, buildtype, buildarchs);
    } else {
        Log('Deploying to emulator ...');
        var appxFolder = getPackage(path, projecttype, buildtype, buildarchs);
        var appxPath = appxFolder + '\\' + fso.GetFolder(appxFolder).Name.split('_Test').join('') + '.appx';
        var cmd = '"' + APP_DEPLOY_UTILS + '" /installlaunch "' + appxPath + '" /targetdevice:xd';
        Log(cmd);
        exec_verbose(cmd);
    }
}

// builds and launches the project on the specified target
function target(path, projecttype, buildtype, buildarchs, buildtarget) {
    if (projecttype != "phone"){
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
                    if (deviceMatch && deviceMatch[1] == buildtarget) {
                        // start deploy to target specified
                        var appxFolder = getPackage(path, projecttype, buildtype, buildarchs);
                        var appxPath = appxFolder + '\\' + fso.GetFolder(appxFolder).Name.split('_Test').join('') + '.appx';
                        Log('Deploying to target with id: ' + buildtarget);
                        cmd = '"' + APP_DEPLOY_UTILS + '" /installlaunch "' + appxPath + '" /targetdevice:' + deviceMatch[1];
                        Log(cmd);
                        exec_verbose(cmd);
                        return;
                    }
                }
                Log('Error : target ' + buildtarget + ' was not found.', true);
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
function installApp(path, projecttype, buildtype, buildarchs) {

    Log("Attempt to install application...");
    Log("\tDirectory : " + path);

    var command = "powershell -ExecutionPolicy RemoteSigned \". " + WINDOWS_STORE_UTILS + "; Install-App " + "'" + getPackage(path, projecttype, buildtype, buildarchs) + "\\Add-AppDevPackage.ps1" + "'\"";
    Log(command);
    exec_verbose(command);
    return;
}

// builds project with arguments specified
// all arguments passes directly into build script without changes
function build(path, buildtype, buildarchs) {
    // if --nobuild flag is specified, no action required here
    if (noBuild) return;

    var cmd = '%comspec% /c ""' + path + '\\cordova\\build"';
    if (buildtype){
        cmd += " --" + buildtype;
    }
    if (buildarchs){
        cmd += ' --archs="' + buildarchs.join(",") + '"';
    }
    cmd += '"';
    exec_verbose(cmd);
}

function run(path, projecttype, buildtype, buildarchs, buildtarget) {
    build(path, buildtype, buildarchs);
    switch (buildtarget){
        case "device":
            device(path, projecttype, buildtype, buildarchs);
            break;
        case "emulator":
            emulator(path, projecttype, buildtype, buildarchs);
            break;
        case null:
            Log("WARNING: [ --target=<ID> | --emulator | --device ] not specified, defaulting to --emulator");
            emulator(path, projecttype, buildtype, buildarchs);
            break;
        default:
            // if buildTarget is neither "device", "emulator" or null
            // then it is a name of target
            target(path, projecttype, buildtype, buildarchs, buildtarget);
            break;
    }
}

// parses script args and set global variables for build/deploy
// throws error if unknown argument specified.
function parseArgs () {

    // return build type, specified by input string, or null, if not build type parameter
    function getBuildType (arg) {
        arg = arg.toLowerCase();
        if (arg == "--debug" || arg == "-d") {
            return "debug";
        }
        else if (arg == "--release" || arg == "-r") {
            return "release";
        }
        else if (arg == "--nobuild") {
            noBuild = true;
            return true;
        }
        return null;
    }

    // returns build architectures list, specified by input string
    // or null if nothing specified, or not --archs parameter
    function getBuildArchs (arg) {
        arg = arg.toLowerCase();
        var archs = /--archs=(.+)/.exec(arg);
        if (archs) {
            // if architectures list contains commas, suppose that is comma delimited
            if (archs[1].indexOf(',') != -1){
                return archs[1].split(',');
            }
            // else space delimited
            return archs[1].split(/\s/);
        }
        return null;
    }

    // returns deploy target, specified by input string or null, if not deploy target parameter
    function getBuildTarget (arg) {
        arg = arg.toLowerCase();
        if (arg == "--device"){
            return "device";
        }
        else if (arg == "--emulator"){
            return "emulator";
        }
        else {
            var target = /--target=(.*)/.exec(arg);
            if (target){
                return target[1];
            }
        }
        return null;
    }

    // returns project type, specified by input string or null, if not project type parameter
    function getProjectType (arg) {
        arg = arg.toLowerCase();
        if (arg == "--phone"){
            return "phone";
        }
        else if (arg == "--store80"){
            return "store80";
        }
        else if (arg == "--store81" || arg == "--store"){
            return "store";
        }
        return null;
    }

    for (var i = 0; i < args.Length; i++) {
        if (getBuildType(args(i))) {
            buildType = getBuildType(args(i));
        } else if (getBuildArchs(args(i))) {
            buildArchs = getBuildArchs(args(i));
        } else if (getBuildTarget(args(i))){
            buildTarget = getBuildTarget(args(i));
        } else if (getProjectType(args(i))){
            projectType = getProjectType(args(i));
        } else {
            Log("Error: \"" + args(i) + "\" is not recognized as a build/deploy option", true);
            Usage();
            WScript.Quit(2);
        }
    }
}

if (args.Count() > 0) {
    // support help flags
    if (args(0) == "--help" || args(0) == "/?" ||
            args(0) == "help" || args(0) == "-help" || args(0) == "/help") {
        Usage();
        WScript.Quit(2);
    }
    else if (!fso.FolderExists(ROOT)) {
        Log('Error: Project directory not found,', true);
        Usage();
        WScript.Quit(2);
    }
    parseArgs();
}

run(ROOT, projectType, buildType, buildArchs, buildTarget);