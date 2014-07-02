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

// build type. Possible values: "debug", "release"
var buildType = null,
// list of build architectures. list of strings
buildArchs = null;

// working dir
var ROOT = WScript.ScriptFullName.split('\\cordova\\lib\\build.js').join('');

// help/usage function
function Usage() {
    Log("");
    Log("Usage: build [ --debug | --release ] [--archs=\"<list of architectures...>\"]");
    Log("    --help    : Displays this dialog.");
    Log("    --debug   : builds project in debug mode. (Default)");
    Log("    --release : builds project in release mode.");
    Log("    -r        : shortcut :: builds project in release mode.");
    Log("    --archs   : Builds project binaries for specific chip architectures. `arm` + `x86` + `x64` are supported.");
    Log("examples:");
    Log("    build ");
    Log("    build --debug");
    Log("    build --release");
    Log("    build --release --archs=\"arm x86\"");
    Log("");
}

// logs messaged to stdout and stderr
function Log(msg, error) {
    if (error) {
        WScript.StdErr.WriteLine(msg);
    }
    else {
        WScript.StdOut.WriteLine(msg);
    }
}

// executes a commmand in the shell
function exec_verbose(command) {
    //Log("Command: " + command);
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status === 0) {
        //Wait a little bit so we're not super looping
        WScript.sleep(100);
        //Print any stdout output from the script
        while (!oShell.StdOut.AtEndOfStream) {
            var line = oShell.StdOut.ReadLine();
            Log(line);
        }
    }
    //Check to make sure our scripts did not encounter an error
    if (!oShell.StdErr.AtEndOfStream) {
        var line = oShell.StdErr.ReadAll();
        Log(line, true);
        WScript.Quit(2);
    }
    return oShell.ExitCode;
}

// checks to see if a .jsproj file exists in the project root
function is_cordova_project(path) {
    if (fso.FolderExists(path)) {
        var proj_folder = fso.GetFolder(path);
        var proj_files = new Enumerator(proj_folder.Files);
        for (;!proj_files.atEnd(); proj_files.moveNext()) {
            if (fso.GetExtensionName(proj_files.item()) == 'shproj') {
                return true;
            }
        }
    }
    return false;
}

// escapes a path so that it can be passed to shell command. 
function escapePath(path) {
    return '"' + path + '"';
}

// returns full path to msbuild tools required to build the project and tools version
function getMSBuildTools() {
    // use the latest version of the msbuild tools available on this machine
    var toolsVersions = ['12.0', '4.0'];
    for (var idx in toolsVersions) {
        try {
            return  {
                version: toolsVersions[idx],
                path: wscript_shell.RegRead('HKLM\\SOFTWARE\\Microsoft\\MSBuild\\ToolsVersions\\' + toolsVersions[idx] + '\\MSBuildToolsPath')
            };
        } catch(err) {}
    }
    Log('MSBuild tools have not been found. Please install Microsoft Visual Studio 2013 or later', true);
    WScript.Quit(2);
}

// builds the project and .xap in debug mode
function build_appx(path, buildtype, buildarchs) {

    if (!buildtype) {
        Log("WARNING: [ --debug | --release ] not specified, defaulting to debug...");
        buildtype = "debug";
    }

    if (!buildarchs) {
        Log("WARNING: target architecture not specified, defaulting to AnyCPU...");
        buildarchs = ["Any CPU"];
    }

    for (var i = 0; i < buildarchs.length; i++) {

        var buildarch = buildarchs[i].toLowerCase();
        // support for "any cpu" specified with or without space
        buildarch = buildarch !== "anycpu" ? buildarch : "any cpu";

        Log("Building Cordova Windows Project:");
        Log("\tConfiguration : " + buildtype);
        Log("\tPlatform      : " + buildarch);
        Log("\tDirectory     : " + path);

        try {
            wscript_shell.CurrentDirectory = path;

            // Get the latest build tools available on this machine
            var msbuild = getMSBuildTools();
            Log("\tMSBuildToolsPath: " + msbuild.path);

            var solutionFilePath = path+'\\CordovaApp.sln'; // default sln file

            if (msbuild.version == '4.0') {
                Log("\r\nWarning. Windows 8.1 and Windows Phone 8.1 target platforms are not supported on this development machine and will be skipped.");
                Log("Please install OS Windows 8.1 and Visual Studio 2013 Update2 in order to build for Windows 8.1 and Windows Phone 8.1.\r\n");
                solutionFilePath = path+'\\CordovaApp.vs2012.sln';
            }

            var buildCommand = escapePath(msbuild.path + 'msbuild') +
                ' ' + escapePath(solutionFilePath) +
                ' /clp:NoSummary;NoItemAndPropertyList;Verbosity=minimal /nologo' +
                ' /p:Configuration=' + buildtype +
                ' /p:Platform="' + buildarch + '"';
            
            // hack to get rid of 'Access is denied.' error when running the shell w/ access to C:\path..
            buildCommand = 'cmd /c "' + buildCommand + '"';
            Log(buildCommand);
            if (exec_verbose(buildCommand) !== 0) {
                // msbuild failed
                WScript.Quit(2);
            }
        } catch (err) {
            Log("Build failed: " + err.message, true);
        }
    }

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
                    // app was built, installation script exists
                    return "\nSUCCESS";
                }
            }

        }

    }
    Log("Error : AppPackages were not built");
    WScript.Quit(2);

}

// parses script args and set global variables for build
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

    for (var i = 0; i < args.Length; i++) {
        if (getBuildType(args(i))) {
            buildType = getBuildType(args(i));
        } else if (getBuildArchs(args(i))) {
            buildArchs = getBuildArchs(args(i));
        } else {
            // Skip unknown args. Build could be called from run/emulate commands,
            // so there could be additional args (specific for run/emulate)

            // Log("Error: \"" + args(i) + "\" is not recognized as a build option", true);
            // Usage();
            // WScript.Quit(2);
        }
    }
}

Log("");

if (args.Count() > 0) {
    // support help flags
    if (args(0) == "--help" || args(0) == "/?" ||
            args(0) == "help" || args(0) == "-help" || args(0) == "/help") {
        Usage();
        WScript.Quit(2);
    }
    else if (!fso.FolderExists(ROOT) || !is_cordova_project(ROOT)) {
        Log("Error: could not find project at " + ROOT, true);
        WScript.Quit(2);
    }

    parseArgs();
}

Log(build_appx(ROOT, buildType, buildArchs));
