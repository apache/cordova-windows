/**
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
var shell = require('shelljs'),
    fs = require('fs'),
    path = require('path');

describe('Cordova create and build', function(){

    var projectFolder     = 'testcreate 応用',
        buildDirectory    = path.join(__dirname, '../..'),
        appPackagesFolder = path.join(buildDirectory, projectFolder, 'AppPackages'),
        buildScriptPath   = '"' + path.join(buildDirectory, projectFolder, 'cordova', 'build') + '"';

    beforeEach(function(){
      shell.exec(path.join('bin', 'create') + ' "' + projectFolder + '" com.test.app 応用', {silent : true});
    });

    afterEach(function() {
        shell.cd(buildDirectory);
        shell.rm('-rf', projectFolder);
    });

    it('spec.1 should create new project', function(){
        expect(fs.existsSync(projectFolder)).toBe(true);
    });

    it('spec.2 should build project', function(){
        shell.exec(buildScriptPath, {silent:true});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function(file) { return file.match(/.*Phone.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Windows.*\.appx.*/); }).length).toBe(1);
    });

    it('spec.3 should build project for particular CPU', function(){
        shell.exec(buildScriptPath + ' --archs=\"x64\"', {silent : true});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function(file) { return file.match(/.*Phone.*x64.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Windows.*x64.*\.appx.*/); }).length).toBe(1);
    });

    it('spec.4 should build project for CPUs separated by whitespaces', function(){
        shell.exec(buildScriptPath + ' --archs=\"x64 x86 arm anycpu\"', {silent : true});
        var packages = shell.ls(appPackagesFolder);
        expect(packages.filter(function(file) { return file.match(/.*Phone.*x86.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Phone.*x64.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Phone.*arm.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Phone.*AnyCPU.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Windows.*x64.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Windows.*x86.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Windows.*arm.*\.appx.*/); }).length).toBe(1);
        expect(packages.filter(function(file) { return file.match(/.*Windows.*anycpu.*\.appx.*/); }).length).toBe(1);
    });
});
