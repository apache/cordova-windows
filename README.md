<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
# 
# http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->

#Apache Cordova for Windows

[![Build status](https://ci.appveyor.com/api/projects/status/19h1fq0lyvwtei05/branch/master)](https://ci.appveyor.com/project/Humbedooh/cordova-windows/branch/master)
[![Build Status](https://travis-ci.org/apache/cordova-windows.svg?branch=master)](https://travis-ci.org/apache/cordova-windows)

This repo contains the code for an [Apache Cordova](http://cordova.apache.org) platform that allows you to build applications that target Windows 10, and Windows 8.1, as well as Windows Phone 8.1. An Apache Cordova based applications is written in HTML, CSS and JavaScript.

(Warning: Windows 8 has been deprecated, please update your applications to target Windows 8.1 or above)

[Apache Cordova](http://cordova.apache.org) is a project of [The Apache Software Foundation (ASF)](http://apache.org)

#Requirements
### Windows 10, Windows 8.1, Windows Phone 8.1

Host OS: Windows 8.1 or Windows 10

Install the tools: [Visual Studio 2015](http://www.visualstudio.com/downloads)

### Windows 8.1,Windows Phone 8.1

Host OS: Windows 8.1

Install the tools: [Visual Studio 2013 Express](http://www.visualstudio.com/downloads/download-visual-studio-vs#d-express-windows-8).

### Windows 8 only (deprecated)

Host OS: Windows 8 or 8.1

Install the tools: [Visual Studio 2012 Express](http://www.visualstudio.com/downloads).

#Getting started
The best way to use this is to install the [Cordova CLI](https://www.npmjs.com/package/cordova), create a project, add the windows platform, and run the app:
	
	npm install -g cordova
	cordova create test
	cordova platform add windows
	cordova run windows
	
#Report Issues
Report them at the [Apache Cordova Issue Tracker](https://issues.apache.org/jira/browse/CB). Create a user account, use `windows` as the component.

#Further Reading
- [Windows Platform Guide](http://cordova.apache.org/docs/en/edge/guide_platforms_win8_index.md.html#Windows%208%20Platform%20Guide)
- [Apache Cordova Documentation](http://docs.cordova.io)
