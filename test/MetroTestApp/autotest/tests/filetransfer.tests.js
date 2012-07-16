describe('FileTransfer', function() {

    // https://github.com/don/cordova-filetransfer
    var server = "http://cordova-filetransfer.jitsu.com";

    // deletes and re-creates the specified content
    var writeFile = function(fileName, fileContent, success, error) {
        var content = fileContent;
        deleteEntry(fileName, function() {
            root.getFile(fileName, {create: true}, function(fileEntry) {
                fileEntry.createWriter(function (writer) {

                    writer.onwrite = function(evt) {
                        success(fileEntry);
                    };

                    writer.onabort = function(evt) {
                        error(evt);
                    };

                    writer.error = function(evt) {
                        error(evt);
                    };

                    writer.write(content + "\n");
                }, error);
            }, error);
        }, error);
    };

    var getMalformedUrl = function() {
        if (device.platform.match(/Android/i)) {
            // bad protocol causes a MalformedUrlException on Android
            return "httpssss://example.com";
        } else {
            // iOS doesn't care about protocol, space in hostname causes error
            return "httpssss://exa mple.com";
        }
    };

    // NOTE: copied from file.tests.js
    // deletes specified file or directory
    var deleteEntry = function(name, success, error) {
        // deletes entry, if it exists
        window.resolveLocalFileSystemURI(root.toURL() + '/' + name,
            function(entry) {
                if (entry.isDirectory === true) {
                    entry.removeRecursively(success, error);
                } else {
                    entry.remove(success, error);
                }
            }, success);
    };
    // deletes and re-creates the specified file
    var createFile = function(fileName, success, error) {
        deleteEntry(fileName, function() {
            root.getFile(fileName, {create: true}, success, error);
        }, error);
    };
    // deletes file, if it exists, then invokes callback
    var deleteFile = function(fileName, callback) {
        root.getFile(fileName, null,
            // remove file system entry
            function(entry) {
                entry.remove(callback, function() { console.log('[ERROR] deleteFile cleanup method invoked fail callback.'); });
            },
            // doesn't exist
            callback);
    };
    // end copied from file.tests.js

    it("should exist and be constructable", function() {
        var ft = new FileTransfer();
        expect(ft).toBeDefined();
    });
    it("should contain proper functions", function() {
        var ft = new FileTransfer();
        expect(typeof ft.upload).toBe('function');
        expect(typeof ft.download).toBe('function');
    });
    describe('FileTransferError', function() {
        it("FileTransferError constants should be defined", function() {
            expect(FileTransferError.FILE_NOT_FOUND_ERR).toBe(1);
            expect(FileTransferError.INVALID_URL_ERR).toBe(2);
            expect(FileTransferError.CONNECTION_ERR).toBe(3);
        });
    });

    describe('download method', function() {

        // NOTE: if download tests are failing, check the white list
        // Android
        //   <access origin="httpssss://example.com"/>
        //   <access origin="apache.org" subdomains="true" />
        //   <access origin="cordova-filetransfer.jitsu.com"/>
        // iOS
        //   # Cordova.plist
        //   ExternalHosts
        //     - Item 1 String cordova-filetransfer.jitsu.com
        //     - Item 2 String *.apache.org

        it("should be able to download a file", function() {
            var fail = jasmine.createSpy();
            var remoteFile = server + "/robots.txt"
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var downloadWin = jasmine.createSpy().andCallFake(function(entry) {
                expect(entry.name).toBe(localFileName);
                deleteFile(localFileName);
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, fail);
            });

            waitsFor(function() { return downloadWin.wasCalled; }, "downloadWin", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(downloadWin).toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
            });
        });
        it("should get http status on failure", function() {
            var downloadWin = jasmine.createSpy();

            var remoteFile = server + "/404";
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var downloadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.http_status).toBe(404);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
                deleteFile(localFileName);
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, downloadFail);
            });

            waitsFor(function() { return downloadFail.wasCalled; }, "downloadFail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(downloadFail).toHaveBeenCalled();
                expect(downloadWin).not.toHaveBeenCalled();
            });
        });
        it("should handle malformed urls", function() {

            var downloadWin = jasmine.createSpy();

            var remoteFile = getMalformedUrl();
            var localFileName = "download_malformed_url.txt";
            var downloadFail = jasmine.createSpy().andCallFake(function(error) {

                // Note: Android needs the bad protocol to be added to the access list
                // <access origin=".*"/> won't match because ^https?:// is prepended to the regex
                // The bad protocol must begin with http to avoid automatic prefix
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
                expect(error.code).toBe(FileTransferError.INVALID_URL_ERR);
                deleteFile(localFileName);
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, downloadFail);
            });

            waitsFor(function() { return downloadFail.wasCalled; }, "downloadFail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(downloadFail).toHaveBeenCalled();
                expect(downloadWin).not.toHaveBeenCalled();
            });
        });
        it("should handle unknown host", function() {
            var downloadWin = jasmine.createSpy();

            var remoteFile = "http://foobar.apache.org/index.html";
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var downloadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.CONNECTION_ERR);
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, root.fullPath + "/" + localFileName, downloadWin, downloadFail);
            });

            waitsFor(function() { return downloadFail.wasCalled; }, "downloadFail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(downloadFail).toHaveBeenCalled();
                expect(downloadWin).not.toHaveBeenCalled();
            });
        });
        it("should handle bad file path", function() {
            var fail = jasmine.createSpy();
            var downloadWin = jasmine.createSpy();

            var remoteFile = server;
            var badFilePath = "c:\\54321";
            var downloadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.FILE_NOT_FOUND_ERR);
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.download(remoteFile, badFilePath, downloadWin, downloadFail);
            });

            waitsFor(function() { return downloadFail.wasCalled; }, "downloadFail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(downloadFail).toHaveBeenCalled();
                expect(downloadWin).not.toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
            });
        });
    });
    describe('upload method', function() {

        it("should be able to upload a file", function() {
            var fail = jasmine.createSpy();
            var uploadFail = jasmine.createSpy();

            var remoteFile = server + "/upload";
            var localFileName = "upload.txt";

            var uploadWin = jasmine.createSpy().andCallFake(function(uploadResult) {
                expect(uploadResult.bytesSent).toBeGreaterThan(0);
                expect(uploadResult.responseCode).toBe(200);
                expect(uploadResult.response).toBeDefined();
                deleteEntry(localFileName);
            });

            var fileWin = function(fileEntry) {
                ft = new FileTransfer();

                var options = new FileUploadOptions();
                options.fileKey = "file";
                options.fileName = localFileName;
                options.mimeType = "text/plain";

                var params = new Object();
                params.value1 = "test";
                params.value2 = "param";
                options.params = params;

                // removing options cause Android to timeout
                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, options);
            };

            runs(function() {
                writeFile(localFileName, "this file should upload", fileWin, fail);
            });

            waitsFor(function() { return uploadWin.wasCalled; }, "uploadWin", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(uploadWin).toHaveBeenCalled();
                expect(uploadFail).not.toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
            });
        });
        it("should get http status on failure", function() {
            var fail = jasmine.createSpy();
            var uploadWin = jasmine.createSpy();

            var remoteFile = server + "/403";
            var localFileName = "upload_expect_fail.txt";
            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.http_status).toBe(403);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
                deleteEntry(localFileName);
            });

            var fileWin = function(fileEntry) {
                var ft = new FileTransfer();

                var options = new FileUploadOptions();
                options.fileKey="file";
                options.fileName=fileEntry.name;
                options.mimeType="text/plain";

                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, options);
            };

            runs(function() {
                writeFile(localFileName, "this file should fail to upload", fileWin, fail);
            });

            waitsFor(function() { return uploadFail.wasCalled; }, "Expecting file upload to fail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(uploadFail).toHaveBeenCalled();
                expect(uploadWin).not.toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
            });
        });
        it("should handle malformed urls", function() {
            var fail = jasmine.createSpy();
            var uploadWin = jasmine.createSpy();

            var remoteFile = getMalformedUrl();
            var localFileName = "malformed_url.txt";
            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.INVALID_URL_ERR);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
                deleteFile(localFileName);
            });
            var fileWin = function(fileEntry) {
                var ft = new FileTransfer();
                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, {});
            };

            runs(function() {
                writeFile(localFileName, "Some content", fileWin, fail);
            });

            waitsFor(function() { return uploadFail.wasCalled; }, "uploadFail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(uploadFail).toHaveBeenCalled();
                expect(uploadWin).not.toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
            });
        });
        it("should handle unknown host", function() {
            var fail = jasmine.createSpy();
            var uploadWin = jasmine.createSpy();

            var remoteFile = "http://foobar.apache.org/robots.txt";
            var localFileName = remoteFile.substring(remoteFile.lastIndexOf('/')+1);
            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.CONNECTION_ERR);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
                deleteFile(localFileName);
            });
            var fileWin = function(fileEntry) {
                var ft = new FileTransfer();
                ft.upload(fileEntry.fullPath, remoteFile, uploadWin, uploadFail, {});
            };

            runs(function() {
                writeFile(localFileName, "# allow all", fileWin, fail);
            });

            waitsFor(function() { return uploadFail.wasCalled; }, "uploadFail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(uploadFail).toHaveBeenCalled();
                expect(uploadWin).not.toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
            });
        });
        it("should handle missing file", function() {
            var fail = jasmine.createSpy();
            var uploadWin = jasmine.createSpy();

            var remoteFile = server + "/upload";
            var localFileName = "does_not_exist.txt";

            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.FILE_NOT_FOUND_ERR);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
            });

            runs(function() {
                deleteFile(localFileName, function() {
                    var ft = new FileTransfer();
                    ft.upload(root.fullPath + "/" + localFileName, remoteFile, uploadWin, uploadFail);
                }, fail);
            });

            waitsFor(function() { return uploadFail.wasCalled; }, "uploadFail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(uploadFail).toHaveBeenCalled();
                expect(uploadWin).not.toHaveBeenCalled();
                expect(fail).not.toHaveBeenCalled();
            });
        });
        it("should handle bad file path", function() {
            var uploadWin = jasmine.createSpy();

            var remoteFile = server + "/upload";

            var uploadFail = jasmine.createSpy().andCallFake(function(error) {
                expect(error.code).toBe(FileTransferError.FILE_NOT_FOUND_ERR);
                expect(error.http_status).not.toBe(401, "Ensure " + remoteFile + " is in the white list");
            });

            runs(function() {
                var ft = new FileTransfer();
                ft.upload("/usr/local/bad/file/path.txt", remoteFile, uploadWin, uploadFail);
            });

            waitsFor(function() { return uploadFail.wasCalled; }, "uploadFail", Tests.TEST_TIMEOUT);

            runs(function() {
                expect(uploadFail).toHaveBeenCalled();
                expect(uploadWin).not.toHaveBeenCalled();
            });

        });

    });
});
