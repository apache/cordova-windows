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
var shell = require('shelljs');
var fs = require('fs');
var path = require('path');

describe('Cordova create and build', function () {

    var projectFolder = 'testcreate 応用';
    var buildDirectory = path.join(__dirname, '../..');
    var prepareScriptPath = '"' + path.join(buildDirectory, projectFolder, 'cordova', 'prepare') + '"';

    var silent = false;

    beforeEach(function () {
        shell.exec(path.join('bin', 'create') + ' "' + projectFolder + '" com.test.app 応用', {silent: silent});
        shell.exec(prepareScriptPath + '', {silent: silent});
    });

    afterEach(function () {
        shell.cd(buildDirectory);
        shell.rm('-rf', projectFolder);
    });

    it('spec.1 should create new project', function () {
        expect(fs.existsSync(projectFolder)).toBe(true);
    });

});
