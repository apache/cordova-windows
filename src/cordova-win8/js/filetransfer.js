function FileTransferError (code , source , target) {
    this.code = code || null;
    this.source = source || null;
    this.target = target || null;
};

FileTransferError.FILE_NOT_FOUND_ERR = 1;
FileTransferError.INVALID_URL_ERR = 2;
FileTransferError.CONNECTION_ERR = 3;

/**
 * FileTransfer uploads a file to a remote server.
 * @constructor
 */
function FileTransfer() { };

/**
* Given an absolute file path, uploads a file on the device to a remote server
* using a multipart HTTP request.
* @param filePath {String}           Full path of the file on the device
* @param server {String}             URL of the server to receive the file
* @param successCallback (Function}  Callback to be invoked when upload has completed
* @param errorCallback {Function}    Callback to be invoked upon error
* @param options {FileUploadOptions} Optional parameters such as file name and mimetype
*/
FileTransfer.prototype.upload = function (filePath, server, successCallback, errorCallback, options) {
    // check for options
    var fileKey = null;
    var fileName = null;
    var mimeType = null;
    var params = null;
    var chunkedMode = true;
    if (options) {
        fileKey = options.fileKey;
        fileName = options.fileName;
        mimeType = options.mimeType;
        if (options.chunkedMode !== null || typeof options.chunkedMode !== "undefined") {
            chunkedMode = options.chunkedMode;
        }
        if (options.params) {
            params = options.params;
        }
        else {
            params = {};
        }
    }

    var error = function (code) {
        errorCallback(new FileTransferError(code));
    }

    var win = function (fileUploadResult) {
        successCallback(fileUploadResult);
    }

    if (filePath == null || typeof filePath == 'undefined') {
        error(FileTransferError.FILE_NOT_FOUND_ERR);
        return;
    }

    if (String(filePath).substr(0, 8) == "file:///") {
        filePath = FileSystemPersistentRoot + String(filePath).substr(8).split("/").join("\\");
    }
    //var upload = null;
    var start = eval(Jscex.compile('promise', function () {
        var storageFile = "";
        try{
            storageFile = $await(Windows.Storage.StorageFile.getFileFromPathAsync(filePath));
        }catch (e) {
            error(FileTransferError.FILE_NOT_FOUND_ERR);
        }
        var stream = $await(storageFile.openAsync(Windows.Storage.FileAccessMode.read));
        var blob = MSApp.createBlobFromRandomAccessStream(storageFile.contentType, stream);
        var formData = new FormData();
        formData.append("source\";filename=\"" + storageFile.name + "\"", blob);
        WinJS.xhr({ type: "POST", url: server, data: formData }).then(function (response) {
            var code = response.status;
            storageFile.getBasicPropertiesAsync().done(function (basicProperties) {

                Windows.Storage.FileIO.readBufferAsync(storageFile).done(function (buffer) {
                    var dataReader = Windows.Storage.Streams.DataReader.fromBuffer(buffer);
                    var fileContent = dataReader.readString(buffer.length);
                    dataReader.close();
                    win(new FileUploadResult(basicProperties.size, code, fileContent));

                })

            })
        }, function () {
            error(FileTransferError.INVALID_URL_ERR);
        })
        
    }));
    start();

    
};

/**
 * Downloads a file form a given URL and saves it to the specified directory.
 * @param source {String}          URL of the server to receive the file
 * @param target {String}         Full path of the file on the device
 * @param successCallback (Function}  Callback to be invoked when upload has completed
 * @param errorCallback {Function}    Callback to be invoked upon error
 */
FileTransfer.prototype.download = function (source, target, successCallback, errorCallback) {
    var win = function (result) {
        var entry = null;
        if (result.isDirectory) {
            entry = new DirectoryEntry();
        }
        else if (result.isFile) {
            entry = new FileEntry();
        }
        entry.isDirectory = result.isDirectory;
        entry.isFile = result.isFile;
        entry.name = result.name;
        entry.fullPath = result.fullPath;
        successCallback(entry);
    };

    var error = function (code) {
        errorCallback(new FileTransferError(code));
    }

    if (target == null || typeof target == undefined) {
        error(FileTransferError.FILE_NOT_FOUND_ERR);
        return;
    }
    if (String(target).substr(0, 8) == "file:///") {
        target = FileSystemPersistentRoot + String(target).substr(8).split("/").join("\\");
    }
    var path = target.substr(0, String(target).lastIndexOf("\\"));
    var fileName = target.substr(String(target).lastIndexOf("\\") + 1);
    if (path == null || fileName == null) {
        error(FileTransferError.FILE_NOT_FOUND_ERR);
        return;
    }

    var download = null;
  
    var start = eval(Jscex.compile('promise', function () {
        var storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(path));
        var storageFile = $await(storageFolder.createFileAsync(fileName, Windows.Storage.CreationCollisionOption.generateUniqueName));
        var uri = Windows.Foundation.Uri(source);
        var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
        download = downloader.createDownload(uri, storageFile);
        download.startAsync().then(function () {
            win(new FileEntry(storageFile.name, storageFile.path));
        }, function () {
            error(FileTransferError.INVALID_URL_ERR);
        });
    }));
    start();
 };

/**
 * Options to customize the HTTP request used to upload files.
 * @constructor
 * @param fileKey {String}   Name of file request parameter.
 * @param fileName {String}  Filename to be used by the server. Defaults to image.jpg.
 * @param mimeType {String}  Mimetype of the uploaded file. Defaults to image/jpeg.
 * @param params {Object}    Object with key: value params to send to the server.
 */
function FileUploadOptions (fileKey, fileName, mimeType, params) {
    this.fileKey = fileKey || null;
    this.fileName = fileName || null;
    this.mimeType = mimeType || null;
    this.params = params || null;
};

/**
 * FileUploadResult
 * @constructor
 */
function FileUploadResult (bytesSent , responseCode , response) {
    this.bytesSent = bytesSent || 0;
    this.responseCode = responseCode || null;
    this.response = response || null;
};
