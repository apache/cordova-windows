// Globals

fso = WScript.CreateObject('Scripting.FileSystemObject');
wscript_shell = WScript.CreateObject("WScript.Shell");
args = WScript.Arguments;

// logs messaged to stdout and stderr
Log = function(msg, error) {
    if (error) {
        WScript.StdErr.WriteLine(msg);
    }
    else {
        WScript.StdOut.WriteLine(msg);
    }
}

// executes a commmand in the shell
exec_verbose = function(command) {
    //Log("Command: " + command);
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status == 0) {
        //Wait a little bit so we're not super looping
        WScript.sleep(100);
        //Print any stdout output from the script
        if (!oShell.StdOut.AtEndOfStream) {
            var line = oShell.StdOut.ReadLine();
            Log(line);
        }
    }
    //Check to make sure our scripts did not encounter an error
    if (!oShell.StdErr.AtEndOfStream) {
        var line = oShell.StdErr.ReadAll();
        Log(line + " " + command, true);
        WScript.Quit(2);
    }
    return oShell.ExitCode;
}

// returns full path to msbuild tools required to build the project
getMSBuildToolsPath = function(path) {
    // target windows8 by default
    var MSBuildVer = '4.0';
    var installInstructions = 'Please install the .NET Framework v4.0.';
    // windows8.1 template requires msbuild v12.0
    // get tools version from jsproj file
    var proj_folder = fso.GetFolder(path);
    var proj_files = new Enumerator(proj_folder.Files);
    for (;!proj_files.atEnd(); proj_files.moveNext()) {
        if (fso.GetExtensionName(proj_files.item()) == 'jsproj' && 
            fso.OpenTextFile(proj_files.item(), 1).ReadAll().indexOf('ToolsVersion="12.0"') > 0) {
                MSBuildVer = '12.0';
                installInstructions = 'Please install Microsoft Visual Studio 2013 or later';
        }
    }
    Log('\tMSBuild version required: ' + MSBuildVer);
    try {
        return wscript_shell.RegRead('HKLM\\SOFTWARE\\Microsoft\\MSBuild\\ToolsVersions\\' + MSBuildVer + '\\MSBuildToolsPath');
    } catch (err) {
        Log(installInstructions, true);
        WScript.Quit(2);
    }
    
    return MSBuildToolsPath;
}

execMsBuild = function(cmd) {
	try {
   		exec_verbose(cmd);
	} catch(e) {
		Log("\r\n** Check if msbuild in your environment path (e.g. C:\\Program Files (x86)\\MSBuild\\12.0\\Bin) **\r\n");
		throw e;
	}
}

// checks to see if a .csproj file exists in the project root
is_cordova_project = function(path, type) {
    if (fso.FolderExists(path)) {
        var proj_folder = fso.GetFolder(path);
        var proj_files = new Enumerator(proj_folder.Files);
        for (;!proj_files.atEnd(); proj_files.moveNext()) {
            if (fso.GetExtensionName(proj_files.item()) == type) {
                return true;
            }
        }
    }
    return false;
}
