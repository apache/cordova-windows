var shell = require('shelljs');
var path = require('path');
var fs = require('fs');
var prepareModule = require('../../template/cordova/lib/prepare');
var DUMMY_PROJECT_PATH = path.join(__dirname, '/fixtures/DummyProject');
var iconPath;
var currentProject;

describe('Cordova clean command', function () {
    beforeEach(function () {
        shell.cp('-rf', DUMMY_PROJECT_PATH, __dirname);
        currentProject = path.join(__dirname, 'DummyProject');
        iconPath = path.join(currentProject, 'images/SplashScreen.scale-100.png');

        var fsExistsSyncOrig = fs.existsSync;
        spyOn(fs, 'existsSync').and.callFake(function (filePath) {
            if (/config\.xml$/.test(filePath)) return true;
            return fsExistsSyncOrig(filePath);
        });
        var fsStatSyncOrig = fs.statSync;
        spyOn(fs, 'statSync').and.callFake(function (filePath) {
            if (/SplashScreen\.scale-100\.png$/.test(filePath)) {
                // Use absolute path:
                return fsStatSyncOrig(iconPath);
            }

            return fsStatSyncOrig(filePath);
        });
    });

    afterEach(function () {
        shell.rm('-rf', currentProject);
    });

    it('spec 1. should remove icons when ran inside Cordova project', function () {
        var config = {
            platform: 'windows',
            root: currentProject,
            locations: {
                root: currentProject,
                configXml: path.join(currentProject, 'config.xml'),
                www: path.join(currentProject, 'www')
            }
        };

        return prepareModule.clean.call(config)
            .then(function () {
                expect(fs.existsSync(iconPath)).toBeFalsy();
            });
    });
});
