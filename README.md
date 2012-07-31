# Cordova-Win8
===

The project supports Cordova on Win8, and uses WinLib4JS for most implementation (others with SQLite3, Jscex and so on).

## Getting Started
---

### Install NodeJS and Git, Init Project
 - Download the node-vxxx-x86.msi from http://nodejs.org/ and install. 
 - Confirm that the path of node and npm has been writen into System environment PATH.
 - Download and install git for Windows http://msysgit.github.com/.
 - Update submodules: `git submodule init` and  `git submodule update`
 - Run the `tool\scripts\init.bat`.
 
### For Cordova API developer 
 - `Want to develop Cordova API`
 - You could use the project in src\ directly.
 - If you want to export the project with zip package, open the project in `\tool\CordovaBuilder` with Visual Studio (`Administrator`) , build and run it, then open you command prompt(`Administrator`), type the command according to the guide:

	~~~ 
	Usage: CordovaBuilder [ BuildOutputPath -c:Type ].  
	    BuildOutputPath : path to save the built application.  
	    -c : which type of project you want to create, 0 for Metro App developers, 1 for Cordova API developers, default is 0.  
	examples:  
	     CordovaBuilder bin\Debug.  
	     CordovaBuilder bin\Release -c:1.
	~~~

 - Zip named CordovaStarter.zip will be generated.  
 
### For Metro App developer
 - `Want to develop Metro App by using Cordova API`
 - Do the same steps as above. -c:Type should be 0. 
 - A Visual Studio template named Cordova-Metro.zip will be generated. Move it to the directory of your VS Template, unzip it. 
    e.g.:`C:\Users\xxxx\Documents\Visual Studio 2012\Templates\ProjectTemplates`
 - Open the template with VS. Then `Add` -> `Existing project...` select the SQLite3.vcxproj in the lib\SQLite\SQLite3. Build it.
 - Then Add `Reference...` -> select the SQLite3.
 - Build and Run the project Cordova-Metro.  
    
### Reference
 - [Jscex](https://github.com/JeffreyZhao/jscex)
 - [SQLite](https://github.com/doo/SQLite3-WinRT)

## Further Reading
---

- [http://wiki.phonegap.com](http://wiki.phonegap.com)