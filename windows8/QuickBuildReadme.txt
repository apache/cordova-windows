Explanation
	The tools in this repository will generate a cordova.js file from the .js files in "src\cordova-win8\js". This file will then be put in a folder (framework), which will be zipped to be used as a template for Visual Studio. Instead of creating a template, you can create your own Visual Studio project from a normal template and use the cordova API from these instructions.

Instructions
1.	Follow the instructions listed in README.md up to creating the Cordova-Metro.zip file (which should be listed for after 'For Metro App develop'. This process should create cordova.js in framework/Cordova-Metro/js.
2.	Create a javascript/html Windows 8 (formerly Metro Style) app or use an existing one from Visual Studio 2012.
3.	Add a copy of cordova.js created in step 1 to the project.
4.	Add the contents of the lib folder in framework/ to the lib folder in the project from step 2. If there is no lib folder, create one.
5.	Then press `Add` -> `Existing project...` select the `SQLite3.vcxproj` in the `lib\SQLite\SQLite3`.
6.	Select the project from step 2 in the Solution Explorer, then `Project` -> `Add Reference...` -> select the SQLite3.
7.	On each html page in the project that needs the cordova scripts, add these lines to those files:

	<script src="lib/Jscex/src/jscex.js"></script>
	<script src="lib/Jscex/src/jscex-builderbase.js"></script>
	<script src="lib/Jscex/src/jscex-parser.js"></script>
	<script src="lib/Jscex/src/jscex-async.js"></script>
	<script src="lib/Jscex/src/jscex-jit.js"></script>
	<script src="lib/Jscex/src/jscex-promise.js"></script>

	<script src="/js/cordova.js"></script>
7.	Confirm that these links correctly reference the files. If not, update the location pointed to by source accordingly.
8.	Build and run.

References
	Cordova API
		http://docs.phonegap.com/en/2.0.0/index.html

Any questions or issues, please email matthew.p.berk@intel.com