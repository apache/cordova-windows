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
var ROOT = WScript.ScriptFullName.split('\\cordova\\lib\\build.js').join('');
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

// help/usage function
function Usage() {
    Log("");
    Log("Usage: build [ --debug | --release ]");
    Log("    --help    : Displays this dialog.");
    Log("    --debug   : builds project in debug mode. (Default)");
    Log("    --release : builds project in release mode.");
    Log("    -r        : shortcut :: builds project in release mode.");
    Log("examples:");
    Log("    build ");
    Log("    build --debug");
    Log("    build --release");
    Log("");
}

// escapes a path so that it can be passed to shell command. 
function escapePath(path) {
    return '"' + path + '"';
}

// returns full path to .sln file
function getSolutionDir(path) {
    var proj_folder = fso.GetFolder(path);
    var proj_files = new Enumerator(proj_folder.Files);
    for (;!proj_files.atEnd(); proj_files.moveNext()) {
        if (fso.GetExtensionName(proj_files.item()) == 'sln') {
            return path + '\\' + fso.GetFileName(proj_files.item());  
        }
    }

    return null;
}

// builds the project and .xap in debug mode
function build_appx(path,isRelease) {

    var mode = (isRelease ? "Release" : "Debug");
    Log("Building Cordova Windows 8 Project:");
    Log("\tConfiguration : " + mode);
    Log("\tDirectory : " + path);

    try {
        wscript_shell.CurrentDirectory = path;
        var MSBuildToolsPath = getMSBuildToolsPath(path);
        Log("\tMSBuildToolsPath: " + MSBuildToolsPath);
        var solutionDir = getSolutionDir(path);
        var buildCommand = escapePath(MSBuildToolsPath + 'msbuild') + ' ' + escapePath(solutionDir) +
            ' /clp:NoSummary;NoItemAndPropertyList;Verbosity=minimal /nologo /p:Configuration=' + mode;
        
        // hack to get rid of 'Access is denied.' error when running the shell w/ access to C:\path..
        buildCommand = 'cmd /c "' + buildCommand + '"';
        Log(buildCommand);
        if (exec_verbose(buildCommand) != 0) {
            // msbuild failed
            WScript.Quit(2);
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
                        return "Success";
                    }

                }
            }

        }
    } catch (err) {
        Log("Build failed: " + err.message, true);
    }
    Log("Error : AppPackages were not built");
    WScript.Quit(2);

}


Log("");

var result;
var isRelease = false;

if (args.Count() > 0) {
    // support help flags
    if (args(0) == "--help" || args(0) == "/?" ||
            args(0) == "help" || args(0) == "-help" || args(0) == "/help") {
        Usage();
        WScript.Quit(2);
    }
    else if (!fso.FolderExists(ROOT) || !is_cordova_project(ROOT, 'jsproj')) {
        Log("Error: could not find project at " + ROOT, true);
        WScript.Quit(2);
    }
     
    isRelease = (args(0) == "--release" || args(0) == "-r");   
}

Log(build_appx(ROOT,isRelease));
