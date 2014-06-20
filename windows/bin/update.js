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

var fso           = WScript.CreateObject("Scripting.FileSystemObject");
var wscript_shell = WScript.CreateObject("WScript.Shell");
var shell         = WScript.CreateObject("shell.application");
var args          = WScript.Arguments;
// working dir
var ROOT = WScript.ScriptFullName.split('\\bin\\update.js').join('');
//Get version number
var VERSION = read(ROOT+'\\VERSION').replace(/\r\n/,'').replace(/\n/,'');
var plugins_folder = "\\Plugins";
var template_folder = "\\templates\\standalone";
// anything thats missing to the project
var overwrite = false;
var replace = false;

// usage function
function Usage() {
    Log("WARNING : Make sure to back up your project before updating!")
    Log("Usage: update Path-To-Project ");//[ -f | -r ] ");
    Log("    Path-To-Old-Project : The path the project you would like to update.");
    //Log("                     -f : Will forcefully overwrite and add all core components of the application.");
    //Log("                     -r : Will create an updated project, only keeping the www assets. *NOTE: no native code will be preserved*");
    Log("examples:");
    Log("    update C:\\Users\\anonymous\\Desktop\\MyProject");
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
    Log("Command: " + command);
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

var ForReading = 1, ForWriting = 2, ForAppending = 8;
var TristateUseDefault = -2, TristateTrue = -1, TristateFalse = 0;

// returns the contents of a file
function read(filename) {
    if (fso.FileExists(filename)) {
        var f=fso.OpenTextFile(filename, 1, 2);
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


// // returns the name of the application
// function get_app_name(path) {
//     var WMAppManifest = read(path + '\\Properties\\WMAppManifest.xml').split('\n');
//     for (line in WMAppManifest) {
//         if (WMAppManifest[line].match(/Title\=\"/)) {
//             return WMAppManifest[line].split('Title="')[1].split('"')[0];
//         }
//     }
//     Log("Error : unable to find applicaiton name in the project.", true);
//     Log(" Path : " + path, true);
//     WScript.Quit(2);
// }

// // returns the name of the application package
// function get_package_name(path) {
//     var WMAppManifest = read(path + '\\Properties\\WMAppManifest.xml').split('\n');
//     for (line in WMAppManifest) {
//         if (WMAppManifest[line].match(/Title\=\"/)) {
//             return WMAppManifest[line].split('Title="')[1].split('"')[0];
//         }
//     }
//     Log("Error : unable to find applicaiton name in the project.", true);
//     Log(" Path : " + path, true);
//     WScript.Quit(2);
// }

// // returns the GUID ame of the application
// function get_app_GUID(path) {
//     var AppXAML = read(path + '\\App.xaml').split('\n');
//     for (line in AppXAML) {
//         if (AppXAML[line].match(/x\:Class\=\"/)) {
//             return AppXAML[line].split('Class="')[1].split('"')[0];
//         }
//     }
//     Log("Error : unable to find package name in the project.", true);
//     Log(" Path : " + path, true);
//     WScript.Quit(2);
// }

// deletes the path element if it exists
function delete_if_exists(path) {
    if (fso.FolderExists(path)) {
        fso.DeleteFolder(path);
    }
    else if (fso.FileExists(path)) {
        fso.DeleteFile(path);
    }
}

function extractMetadata(path) {
    if (!fso.FileExists(path+'/config.xml')) {
        Log('config.xml does not exist');
        WScript.Quit(2);
    }

    var meta =  { // default values
        namespace: 'io.cordova.hellocordova',
        name: 'HelloCordova'
    }

    var config = read(path + '/config.xml').split('\n');
    for (line in config) {
        // TODO read real values from config.xml
        // in case of cli all values will be updated by cli for you
        // but the script could be used w/o cli so we should correctly populate meta
    }

    return meta;
}

function quote(value) {
    return "\"" + value + "\"";
}

// updates the cordova.js in project along with the cordova tooling.
function update_project(path) {
    var meta = extractMetadata(path);

    delete_if_exists(path);

    // this could be used to automatically produce correct folder name under cli
    // var targetPath = path.replace(/platforms\\windows8$/, 'platforms\\windows')

    exec_verbose(quote(ROOT + '\\bin\\create.bat')
        + ' ' + quote(path) 
        + ' ' + quote(meta.namespace)
        + ' ' + quote(meta.name));
}

// no args
if (args.Count() == 0) {
    Usage();
    WScript.Quit(1);
}

// to many args
if(args.Count() > 2) {
    Log("Error : too many arguments provided.", true);
    WScript.Quit(1);
}

// help
if (args(0).indexOf("--help") > -1 || args(0).indexOf("/?") > -1 ) {
    Usage();
    WScript.Quit(1);
}

// folder does not exist
if (!fso.FolderExists(args(0))) {
    Log("The given path to the project does not exist.", true);
    Log(" Please provide a path to the project you would like to update.", true);
    Usage();
    WScript.Quit(2);
}

update_project(args(0));