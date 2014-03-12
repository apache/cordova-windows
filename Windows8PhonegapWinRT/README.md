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

Getting Started with Windows8PhonegapWinRT
==========================================

This guide describes how to set up your development environment for Windows8PhonegapWinRT and run a sample application.
 
During development of Windows 8 and Windows RT, Microsoft deprecated the name "Metro-style apps". On MSDN, this type of app is now called a "Windows Store" app. That's the name that we'll use in this guide. Also in this guide whenever we refer to Windows 8, you should take that to mean both Windows 8 and Windows RT.

1. Requirements
---------------

- Windows 8

- Visual Studio 2012 Professional or better, or Visual Studio 2012 Express for Windows 8

Follow the instructions [here](http://www.windowsstore.com/) to submit your apps Windows Store.


2. Setup New Project using Windows8PhonegapWinRT
------------------------------------------------

You can build Windows 8 apps also using the "HTML/JavaScript track" available in Windows Store apps. The purpose of Windows8PhonegapWinRT is to expose the same APIs used on all the other Cordova platforms, now on WinRT.
In Windows8PhonegapWinRT all the plugins are created using WinRT and C#.
Download the Windows8PhonegapWinRT and open it in visual studio 2012. Create application using HTML, CSS and JavaScript using Phonegap APIs and put the above files in the “www” folder of the project. Build and run the application.
Here the splash screen is LNT logo (SplashScreenImage.png). If required the default Splash screen can be changed.
Windows8PhonegapWinRT code is to build Apache Cordova applications that target WinRT framework for Windows 8.
Important!!!
When you add or remove files/folders in the www folder you will need to do the following:
•	Ensure the new item is included in the project ( Content ) This includes ALL images/css/html/js/* and anything that you want available at runtime.
