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
var ROOT = WScript.ScriptFullName.split('\\cordova\\lib\\deploy.js').join('');
var DIR = ROOT + '\\cordova\\lib\\';

function include(path) {
    var fs, file, code;

    fs = WScript.createObject("Scripting.FileSystemObject");
    file = fs.openTextFile(DIR + '\\' + path);
    code = file.readAll();
    file.close();

    eval(code);
}
include('common.js');

// path to WindowsStoreAppUtils.ps1; provides helper functions to install/unistall/start Windows Store app
var WINDOWS_STORE_UTILS = '\\cordova\\lib\\WindowsStoreAppUtils.ps1';
var WINDOWS_STORE_UTILS_SRC = '\\cordova\\lib\\WindowsStoreAppUtils';

//build types
var NONE = 0,
    DEBUG = 1,
    RELEASE = 2,
    NO_BUILD = 3;
var build_type = NONE;

var PACKAGE_NAME = '$namespace$';

// help function
function Usage() {
    Log("");
    Log("Usage: run [ --device | --emulator | --target=<id> ] [ --debug | --release | --nobuild ]");
    Log("    --device      : Deploys and runs the project on the connected device.");
    Log("    --emulator    : Deploys and runs the project on an emulator.");
    Log("    --target=<id> : Deploys and runs the project on the specified target.");
    Log("    --debug       : Builds project in debug mode.");
    Log("    --release     : Builds project in release mode.");
    Log("    --nobuild     : Ueses pre-built xap, or errors if project is not built.");
    Log("examples:");
    Log("    run");
    Log("    run --emulator");
    Log("    run --device");
    Log("    run --target=7988B8C3-3ADE-488d-BA3E-D052AC9DC710");
    Log("    run --device --release");
    Log("    run --emulator --debug");
    Log("");
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

// returns the contents of a file
function read(filename) {
    if (fso.FileExists(filename)) {
        var f=fso.OpenTextFile(filename, 1,2);
        var s=f.ReadAll();
        f.Close();
        return s;
    }
    else {
        Log('Cannot read non-existant file : ' + filename, true);
        WScript.Quit(2);
    }
    return null;
}

// writes content to a file
function write(filename, content) {
    var f=fso.OpenTextFile(filename, 2,2);
    f.Write(content);
    f.Close();
}

function localMachine(path) {
    Log('Deploying to local machine ...');
    makeAppStoreUtils(path);
    uninstallApp(path);
    installApp(path);

    var command = "powershell \". .\\" + WINDOWS_STORE_UTILS + "; Start-Locally " + PACKAGE_NAME;
    Log(command);
    exec_verbose(command);
}

// launches project on device
function device(path)
{
    // on windows8 platform we treat this command as running application on local machine
    localMachine(path);
}

// launches project on emulator
function emulator(path)
{
    // TODO: currently we can run application on local machine only
    localMachine(path);
}

// builds and launches the project on the specified target
function target(path, device_id) {
    Log('ERROR: not supported yet', true);
    Log('DEPLOY FAILED.', true);
    WScript.Quit(2);
    
}

function makeAppStoreUtils(path) {

    if (fso.FileExists(path + WINDOWS_STORE_UTILS)) {
        return;
    }

    Log("Making PowerShell script for Windows Store Apps..");

    write(path + WINDOWS_STORE_UTILS, read(path + WINDOWS_STORE_UTILS_SRC));
}

// uninstalls previous application instance (if exists)
function uninstallApp(path) {
    Log("Attempt to uninstall previous application version...");
    Log("\tDirectory : " + path);

    wscript_shell.CurrentDirectory = path;
    var command = "powershell \". .\\" + WINDOWS_STORE_UTILS + "; Uninstall-App " + PACKAGE_NAME;
    Log(command);
    exec_verbose(command);
}

// executes store application installation script (Add-AppDevPackage.ps1)
function installApp(path) {

    Log("Attempt to install application...");
    Log("\tDirectory : " + path);
    
    wscript_shell.CurrentDirectory = path;

    // TODO: there could be multiple AppPackages
    // check if AppPackages created
    if (fso.FolderExists(path + '\\AppPackages')) {
        var out_folder = fso.GetFolder(path + '\\AppPackages');
        var subFolders = new Enumerator(out_folder.SubFolders);
        for(;!subFolders.atEnd();subFolders.moveNext())
        {
            var subFolder = subFolders.item();
            var files = new Enumerator(subFolder.Files);
            for(;!files.atEnd();files.moveNext())
            {
                if(fso.GetExtensionName(files.item()) == "ps1")
                {
                    var command = "powershell \". .\\" + WINDOWS_STORE_UTILS + "; Install-App " + "'" + files.item() + "'";
                    Log(command);
                    exec_verbose(command);
                    return;
                }

            }
        }

    }
    Log('Error : AppPackages were not built or Add-AppDevPackage.ps1 was not found', true);
    WScript.Quit(2);
}

function build(path) {
    switch (build_type) {
        case DEBUG :
            exec_verbose('%comspec% /c "' + ROOT + '\\cordova\\build" --debug');
            break;
        case RELEASE :
            exec_verbose('%comspec% /c "' + ROOT + '\\cordova\\build" --release');
            break;
        case NO_BUILD :
            break;
        case NONE :
            Log("WARNING: [ --debug | --release | --nobuild ] not specified, defaulting to --debug.");
            exec_verbose('%comspec% /c "' + ROOT + '\\cordova\\build" --debug');
            break;
        default :
            Log("Build option not recognized: " + build_type, true);
            WScript.Quit(2);
            break;
    }
}

if (args.Count() > 0) {
    // support help flags
    if (args(0) == "--help" || args(0) == "/?" ||
            args(0) == "help" || args(0) == "-help" || args(0) == "/help") {
        Usage();
        WScript.Quit(2);
    }
    else if (args.Count() > 2) {
        Log('Error: Too many arguments.', true);
        Usage();
        WScript.Quit(2);
    }
    else if (fso.FolderExists(ROOT)) {
        if (args.Count() > 1) {
            if (args(1) == "--release") {
                build_type = RELEASE;
            }
            else if (args(1) == "--debug") {
                build_type = DEBUG;
            }
            else if (args(1) == "--nobuild") {
                build_type = NO_BUILD;
            }
            else {
                Log('Error: \"' + args(1) + '\" is not recognized as a deploy option', true);
                Usage();
                WScript.Quit(2);
            }
        }

        if (args(0) == "--emulator" || args(0) == "-e") {
            build(ROOT);
            emulator(ROOT);
        }
        else if (args(0) == "--device" || args(0) == "-d") {
            build(ROOT);
            device(ROOT);
        }
        else if (args(0).substr(0,9) == "--target=") {
            build(ROOT);
            var device_id = args(0).split("--target=").join("");
            target(ROOT, device_id);
        }
        else {
            Log("WARNING: [ --target=<ID> | --emulator | --device ] not specified, defaulting to --emulator");
            if (args(0) == "--release") {
                build_type = RELEASE;
                build(ROOT);
                emulator(ROOT);
            }
            else if (args(0) == "--debug") {
                build_type = DEBUG;
                build(ROOT);
                emulator(ROOT);
            }
            else if (args(0) == "--nobuild") {
                build_type = NO_BUILD;
                emulator(ROOT);
            }
            else {
                Log('Error: \"' + args(0) + '\" is not recognized as a deploy option', true);
                Usage();
                WScript.Quit(2);
            }
        }
    }
    else {
        Log('Error: Project directory not found,', true);
        Usage();
        WScript.Quit(2);
    }
}
else {
    Log("WARNING: [ --target=<ID> | --emulator | --device ] not specified, defaulting to --emulator");
    build(ROOT);
    emulator(ROOT);
}