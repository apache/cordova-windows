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

📌 **Deprecation Notice**

This repository is deprecated and no more work will be done on this by Apache Cordova. You can continue to use this and it should work as-is but any future issues will not be fixed by the Cordova community.

Feel free to fork this repository and improve your fork. Existing forks are listed in [Network](../../network) and [Forks](../../network/members).

- Learn more: https://github.com/apache/cordova/blob/master/deprecated.md#deprecated-platforms
---



# Apache Cordova for Windows

[![Build status](https://ci.appveyor.com/api/projects/status/19h1fq0lyvwtei05/branch/master)](https://ci.appveyor.com/project/Humbedooh/cordova-windows/branch/master)
[![Build Status](https://travis-ci.org/apache/cordova-windows.svg?branch=master)](https://travis-ci.org/apache/cordova-windows)
[![codecov.io](https://codecov.io/github/apache/cordova-windows/coverage.svg?branch=master)](https://codecov.io/github/apache/cordova-windows?branch=master)

This repo contains the code for an [Apache Cordova](http://cordova.apache.org) platform that allows you to build applications that target Windows 10, and Windows 8.1, as well as Windows Phone 8.1. An Apache Cordova based applications is written in HTML, CSS and JavaScript.

(Warning: Windows 8 has been deprecated, please update your applications to target Windows 8.1 or above)

[Apache Cordova](http://cordova.apache.org) is a project of [The Apache Software Foundation (ASF)](http://apache.org)

# Requirements

See https://cordova.apache.org/docs/en/dev/guide/platforms/windows/index.html#requirements-and-support

Note that Visual Studio 2019 is not supported, as discussed in [cordova-windows issue #327](https://github.com/apache/cordova-windows/issues/327).

# Getting started

The best way to use this is to install the [Cordova CLI](https://www.npmjs.com/package/cordova), create a project, add the windows platform, and run the app:

	npm install -g cordova
	cordova create test
	cordova platform add windows
	cordova run windows

# Getting logs from Windows Store applications

You can get your JavaScript logs as well as Windows logs related to your Windows Store application by running the following command from your app directory:

	platforms\windows\cordova\log

In most cases, this command requires administrator privileges. However, if you want to gather logs without admin privileges, you may need to manually enable logging channel via Event Viewer:

	Start -> Run -> eventvwr
	View -> Show Analytic and Debug Logs
	Applications and Services Logs -> Microsoft -> Windows -> AppHost -> AppTracing -> Enable Log

Please note that the log command is supported only for Windows Store applications and cannot get logs from Windows Phone application.

# Report Issues

Report them [right here at GitHub using the "Issues" tab](https://github.com/apache/cordova-windows/issues).

# Further Reading

- [Windows Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/windows/index.html)
- [Apache Cordova Documentation](http://docs.cordova.io)
