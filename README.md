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

 - A ZIP file named *CordovaStarter.zip* will be generated.  
 
### For Metro App developer
 - **Who want to develop Metro App by using Cordova API**
 - Do the same steps as above. -c:Type should be 0. 
 - A Visual Studio template named **Cordova-Metro.zip** will be generated. Move it to the directory of your VS Template. You do not need to unzip it.
    e.g.:`C:\Users\xxxx\Documents\Visual Studio 2012\Templates\ProjectTemplates`
 - Open the VS, `FILE` -> `New` -> `Project...`, input the template name 'Cordova-Metro' in the search textField. Select the template and modify items about your new proj at the bottom of the pop-up window.
<img src="http://i.imgur.com/DvkAN.png" width="80%"/>
 - Click the button `OK`. Then `Add` -> `Existing project...` select the `SQLite3.vcxproj` in the `lib\SQLite\SQLite3`. Build it.
 - Select the Cordova project in the Solution Explorer, then `Project` -> 'Add Reference...` -> select the SQLite3.
 - Build and Run the project Cordova-Metro. If running takes a long time, simply stop the running, then rerun (known issue).
 
### How to Run the Tests 
  - Open the `src\src.sln` with Visual Studio.
  - Build or re-build the project.
  - Modify the `default.html` under `test` folder, choose the test case you want to run, and comment out any other tests.
 
```html
<!-- Tests -->
<!--
<script type="text/javascript" src="tests/file.tests.js"></script>
<script type="text/javascript" src="tests/filetransfer.tests.js"></script>
<script type="text/javascript" src="tests/storage.tests.js"></script>
<script type="text/javascript" src="tests/geolocation.tests.js"></script>
<script type="text/javascript" src="tests/camera.tests.js"></script>
<script type="text/javascript" src="tests/capture.tests.js"></script>
<script type="text/javascript" src="tests/accelerometer.tests.js"></script>
-->
<script type="text/javascript" src="tests/compass.tests.js"></script>
<!--
<script type="text/javascript" src="tests/network.tests.js"></script>
<script type="text/javascript" src="tests/media.tests.js"></script>
-->
```

  - Now run the project, and you will get a result page as below.
<img src="http://i.imgur.com/OgTUP.png" />

### Reference
 - [SQLite3 WinRT Component](https://github.com/doo/SQLite3-WinRT)
 - [Jscex: Asynchronous flow control in JavaScript, with JavaScript](https://github.com/JeffreyZhao/jscex)


## Further Reading
- [http://docs.phonegap.com](http://docs.phonegap.com)
- [http://wiki.phonegap.com](http://wiki.phonegap.com)