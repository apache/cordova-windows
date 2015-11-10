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

var rewire = require('rewire');
var et = require('elementtree');
var xml = require('cordova-common').xmlHelpers;
var AppxManifest = rewire('../../template/cordova/lib/AppxManifest');
var Win10AppxManifest = AppxManifest.__get__('Win10AppxManifest');

var WINDOWS_MANIFEST = 'template/package.windows.appxmanifest';
var WINDOWS_PHONE_MANIFEST = 'template/package.phone.appxmanifest';

describe('AppxManifest', function () {

    var XMLS = {
        '/no/prefixed': new et.ElementTree(et.XML('<?xml version="1.0" encoding="UTF-8"?><Package/>')),
        '/uap/prefixed': new et.ElementTree(et.XML('<?xml version="1.0" encoding="UTF-8"?><Package xmlns:uap=""/>'))
    };

    beforeEach(function () {
        var parseElementtreeSyncOrig = xml.parseElementtreeSync;
        spyOn(xml, 'parseElementtreeSync').andCallFake(function (manifestPath) {
            return XMLS[manifestPath] || parseElementtreeSyncOrig(manifestPath);
        });
    });

    describe('constructor', function () {

        it('should create a new AppxManifest instance', function () {
            var manifest;
            expect(function () { manifest = new AppxManifest(WINDOWS_MANIFEST); }).not.toThrow();
            expect(manifest instanceof AppxManifest).toBe(true);
        });

        it('should throw if first parameter is not a file', function () {
            expect(function () { new AppxManifest('/invalid/path'); }).toThrow();
        });

        it('should throw if first parameter is not a valid manifest file (no "Package" tag)', function () {
            expect(function () { new AppxManifest('/invalid/manifest'); }).toThrow();
        });

        it('should add ":" to manifest prefix if needed', function () {
            expect(new AppxManifest(WINDOWS_MANIFEST, 'prefix').prefix).toEqual('prefix:');
        });
    });

    describe('static get() method', function () {

        it('should return an AppxManifest instance', function () {
            expect(AppxManifest.get(WINDOWS_MANIFEST) instanceof AppxManifest).toBe(true);
        });

        it('should detect manifest prefix based on "Package" element attributes', function () {
            expect(AppxManifest.get(WINDOWS_MANIFEST).prefix).toEqual('m2:');
            expect(AppxManifest.get(WINDOWS_PHONE_MANIFEST).prefix).toEqual('m3:');
        });

        it('should instantiate either AppxManifest or Windows 10 AppxManifest based on manifest prefix', function () {
            expect(AppxManifest.get('/no/prefixed').prefix).toEqual('');
            expect(AppxManifest.get('/no/prefixed') instanceof AppxManifest).toBe(true);
            expect(AppxManifest.get('/no/prefixed') instanceof Win10AppxManifest).toBe(false);

            expect(AppxManifest.get('/uap/prefixed').prefix).toEqual('uap:');
            expect(AppxManifest.get('/uap/prefixed') instanceof Win10AppxManifest).toBe(true);
        });
    });

    describe('instance get* methods', function () {
        var methods = ['getPhoneIdentity','getIdentity','getProperties','getApplication','getVisualElements'];

        it('should exists', function () {
            var manifest = AppxManifest.get(WINDOWS_PHONE_MANIFEST);
            var emptyManifest = AppxManifest.get('/no/prefixed');

            methods.forEach(function (method) {
                expect(manifest[method]).toBeDefined();
                expect(manifest[method]).toEqual(jasmine.any(Function));
                expect(function () { manifest[method](); }).not.toThrow();
                expect(function () { emptyManifest[method](); }).toThrow();
                expect(manifest[method]()).toBeDefined();
            });
        });
    });
});

