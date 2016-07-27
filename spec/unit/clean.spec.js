var shell                = require('shelljs'),
    path                 = require('path'),
    fs                   = require('fs'),
    prepareModule        = require('../../template/cordova/lib/prepare'),
    DUMMY_PROJECT_PATH   = path.join(__dirname, '/fixtures/DummyProject'),
    ICON_FOLDER_PATH     = path.join(__dirname, '/fixtures/images'),
    iconPath, currentProject;

describe('Cordova clean command', function() {
    beforeEach(function() {
        shell.cp('-rf', DUMMY_PROJECT_PATH, __dirname);
        currentProject = path.join(__dirname, 'DummyProject');
        shell.cp('-rf', ICON_FOLDER_PATH, currentProject);
        iconPath = path.join(currentProject, 'images/SplashScreen.scale-100.png');   
    });

    afterEach(function() {
        shell.rm('-rf', currentProject);
    });

    it('spec 1. should remove icons', function(done) {
        var fsExistsSyncOrig = fs.existsSync;
        spyOn(fs, 'existsSync').andCallFake(function (filePath) {
            if (/config\.xml$/.test(filePath)) return true;
            return fsExistsSyncOrig(filePath);
        });
        var config = {
            platform: 'windows',
            root: currentProject,
            locations: {
                root: currentProject,
                configXml: path.join(currentProject, 'config.xml'),
                www: path.join(currentProject, 'www')
            }
        };   
        var rejected = jasmine.createSpy();
        prepareModule.clean.call(config)
        .then(function() {
            expect(fs.existsSync(iconPath)).toBeFalsy();
        }, rejected)
        .finally(function() {
            expect(rejected).not.toHaveBeenCalled();
            done();
        });
    });
});
