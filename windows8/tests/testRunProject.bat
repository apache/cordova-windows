@ECHO OFF
SET test_project=%~dp0TestOutput
rd /s /q %test_project%
echo "Running bin/create && cordova run"
..\bin\create  %test_project% && cd %test_project% && .\cordova\run
