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


var args = WScript.Arguments;
var wscript_shell = WScript.CreateObject("WScript.Shell");

function Usage() {
    Log("Usage: [ check_reqs | cscript check_reqs.js ]");
    Log("examples:");
    Log("    cscript C:\\Users\\anonymous\\cordova-windows\\windows8\\bin\\check_reqs.js");
    Log("    CordovaWindowsPhone\\bin\\check_reqs");

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

// gets the output from a command, failing with the given error message
function check_command(cmd, fail_msg) {
    Log("CMD:"+cmd);
    var out = wscript_shell.Exec(cmd);
    while (out.Status == 0) {
        WScript.Sleep(100);
    }

    //Check that command executed
    if (!out.StdErr.AtEndOfStream) {
        var line = out.StdErr.ReadLine();
        Log(fail_msg, true);
        Log('Output : ' + line, true);
        WScript.Quit(1);
    }

    if (!out.StdOut.AtEndOfStream) {
        var line = out.StdOut.ReadAll();
        return line;
    }
    else {
         Log('Unable to get output from command "' + cmd + '"', true);
         WScript.Quit(1);
    }
}


if (args.Count() > 0) {
    Usage();
    WScript.Quit(1);
}
else
{
/* The tooling for cordova windows phone requires these commands
 *  in the environment PATH variable.
 * - msbuild (ex. C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319)
 */
    var version;

    try {
        version = wscript_shell.RegRead("HKLM\\SOFTWARE\\Microsoft\\MSBuild\\ToolsVersions\\4.0\\MSBuildRuntimeVersion");
        if(version != null && version.indexOf("4.0") == 0) {
            // All good!
            Log(version);
        }
        else {
            throw(new Error("version not 4.0"));
        }
    }
    catch(err) {
        Log('Please install the .NET Framework v4.0 (part of the latest windows phone SDK\'s).', true);
        WScript.Quit(2);
    }
}

