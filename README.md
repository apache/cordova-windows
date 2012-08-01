# Apache Cordova for Windows 8 Metro
===

The project supports Cordova on Win8, and uses WinLib4JS for most implementation (others with SQLite3, Jscex and so on).

## Getting Started

 
### For Cordova API developer 
 - **Who want to develop Cordova API**
 - You could use the project in `src` folder directly.
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
 - **Who want to develop Metro App by using Cordova API**
 - Do the same steps as above. -c:Type should be 0. 
 - A Visual Studio template named **Cordova-Metro.zip** will be generated. Move it to the directory of your VS Template **(DO NOT UNZIP)**. 
    e.g.:`C:\Users\xxxx\Documents\Visual Studio 2012\Templates\ProjectTemplates`
 - Open the VS, `FILE` -> `New` -> `Project...`, input the template name 'Cordova-Metro' in the search textField. Select the template and modify items about your new proj at the bottom of the pop-up window.
      ![Screenshot](http://i.imgur.com/DvkAN.png)
 - Click the button `OK`. Then `Add` -> `Existing project...` select the `SQLite3.vcxproj` in the `lib\SQLite\SQLite3`. Build it.
 - Then Add `Reference...` -> select the SQLite3.
 - Build and Run the project Cordova-Metro.  
    
### Reference
 - [SQLite3 WinRT Component](https://github.com/doo/SQLite3-WinRT)
 - [Jscex: Asynchronous flow control in JavaScript, with JavaScript](https://github.com/JeffreyZhao/jscex)


## Further Reading
- [http://docs.phonegap.com](http://docs.phonegap.com)
- [http://wiki.phonegap.com](http://wiki.phonegap.com)