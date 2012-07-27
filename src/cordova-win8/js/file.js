var utils = {
     clone: function (obj) {
        if (!obj) {
            return obj;
        }

        var retVal, i;

        if (obj instanceof Array) {
            retVal = [];
            for (i = 0; i < obj.length; ++i) {
                retVal.push(_self.clone(obj[i]));
            }
            return retVal;
        }

        if (obj instanceof Function) {
            return obj;
        }

        if (!(obj instanceof Object)) {
            return obj;
        }

        if (obj instanceof Date) {
            return obj;
        }

        retVal = {};
        for (i in obj) {
            if (!(i in retVal) || retVal[i] != obj[i]) {
                retVal[i] = _self.clone(obj[i]);
            }
        }
        return retVal;
    },

    close: function (context, func, params) {
        if (typeof params === 'undefined') {
            return function () {
                return func.apply(context, arguments);
            };
        } else {
            return function () {
                return func.apply(context, params);
            };
        }
    },

    /**
         * Extends a child object from a parent object using classical inheritance
         * pattern.
         */
    extend: (function () {
        var F = function () { };
        return function (Child, Parent) {

            F.prototype = Parent.prototype;
            Child.prototype = new F();
            Child.__super__ = Parent.prototype;
            Child.prototype.constructor = Child;
        };
    }()),

    /**
         * Alerts a message in any available way: alert or console.log.
         */
    alert: function (msg) {
        if (alert) {
            alert(msg);
        } else if (console && console.log) {
            console.log(msg);
        }
    }
};

Jscex.Promise.create = function (init) {
    return new WinJS.Promise(init);
}

var Metadata = function (time) {
    this.modificationTime = (typeof time != 'undefined' ? new Date(time) : null);
};

var FileSystemPersistentRoot = (function () {
    //var filePath = Windows.Storage.ApplicationData.current.localFolder.path;
    var filePath = "";
    do {
        Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("per", Windows.Storage.CreationCollisionOption.openIfExists).done(function (storageFolder) {
            filePath = storageFolder.path;
        });
    }
    while (filePath == "");
    filePath = filePath;
    //console.log(filePath);
    return filePath;
}());

var FileSystemTemproraryRoot = (function () {
    //var filePath = Windows.Storage.ApplicationData.current.temporaryFolder.path;
    var filePath = "";
    do {
        Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("tem", Windows.Storage.CreationCollisionOption.openIfExists).done(function (storageFolder) {
            filePath = storageFolder.path;
        });
    }
    while (filePath == "");
    filePath = filePath;
    //console.log(filePath);
    return filePath;
}());



function LocalFileSystem() {
};
LocalFileSystem.TEMPORARY = 0;
LocalFileSystem.PERSISTENT = 1;



 /**
 * Look up file system Entry referred to by local URI.
 * @param {DOMString} uri  URI referring to a local file or directory
 * @param successCallback  invoked with Entry object corresponding to URI
 * @param errorCallback    invoked if error occurs retrieving file system entry
 */
function resolveLocalFileSystemURI (uri, successCallback, errorCallback) {
        // error callback
    var fail = function(error) {
        if (typeof errorCallback === 'function') {
            errorCallback(new FileError(error));
        }
    };
    // if successful, return either a file or directory entry
    var success = function(entry) {
        var result;

        if (entry) {
            if (typeof successCallback === 'function') {
                // create appropriate Entry object
                result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
                try {
                    successCallback(result);
                }
                catch (e) {
                    console.log('Error invoking callback: ' + e);
                }
            }
        }
        else {
            
            // no Entry object returned
            fail(FileError.NOT_FOUND_ERR);
        }
    };

    var path = uri;
    path = String(path).split(" ").join("\ ");

    // support for file name with parameters
    if (String(path).match(new RegExp(/\?/g))) {
        path = String(path).split("\?")[0];
    };

    // support for encodeURI
    if (String(path).match(new RegExp(/\%5/g))) {
        path = decodeURI(path);
    };
    
    // support for special path start with file:/// 
    if (String(path).substr(0, 8) == "file:///") {
        path = FileSystemPersistentRoot + "\\" + String(path).substr(8).split("/").join("\\");
        Windows.Storage.StorageFile.getFileFromPathAsync(path).then(function (storageFile) {

            success(new FileEntry(storageFile.name, storageFile.path));
        }, function () {
            Windows.Storage.StorageFolder.getFolderFromPathAsync(path).then(function (storageFolder) {

                success(new DirectoryEntry(storageFolder.name, storageFolder.path));
            }, function () {
                fail(FileError.NOT_FOUND_ERR);
            })
        })
    } else {
        
        Windows.Storage.StorageFile.getFileFromPathAsync(path).then(function (storageFile) {

            success(new FileEntry(storageFile.name, storageFile.path));
        }, function () {
            Windows.Storage.StorageFolder.getFolderFromPathAsync(path).then(function (storageFolder) {

                success(new DirectoryEntry(storageFolder.name, storageFolder.path));
            }, function () {
                fail(FileError.ENCODING_ERR);
            })
        })

    }
    
    
};




function requestFileSystem(type, size, successCallback, errorCallback) {
    var fail = function (code) {
        if (typeof errorCallback === 'function') {
            errorCallback(new FileError(code));
        }
    };

    if (type < 0 || type > 3) {
        fail(FileError.SYNTAX_ERR);
    } else {
        // if successful, return a FileSystem object
        var success = function (file_system) {
            if (file_system) {
                if (typeof successCallback === 'function') {
                    // grab the name and root from the file system object
                    var result = new FileSystem(file_system.name, file_system.root);
                    successCallback(result);
                }
            }
            else {
                // no FileSystem object returned
                fail(FileError.NOT_FOUND_ERR);
            }
        };
        var filePath = "";
        var result = null;
        var name = ""
        switch (type) {
            case LocalFileSystem.TEMPORARY:
                try {
                    filePath = FileSystemTemproraryRoot;
                   
                    name = "temporary";
                } catch (e) {
                }
                break;
            case LocalFileSystem.PERSISTENT:
                try {
                    filePath = FileSystemPersistentRoot;
                    name = "persistent";

                } catch (e) { }
               
                break;
        }

        if (size > 10000000000) {
            fail(FileError.QUOTA_EXCEEDED_ERR);
            return;
        }
        try {
            
            var fileSystem = new FileSystem(name, new DirectoryEntry(name, filePath));
            result = fileSystem;
            success(result);
        } catch (e) {

        }

    }


}



function FileSystem(name, root) {
    this.name = name || null;
    if (root) {
        this.root = new DirectoryEntry(root.name, root.fullPath);
    }
};


function FileError(error) {
    this.code = error || null;
}

// File error codes
// Found in DOMException
FileError.NOT_FOUND_ERR = 1;
FileError.SECURITY_ERR = 2;
FileError.ABORT_ERR = 3;

// Added by File API specification
FileError.NOT_READABLE_ERR = 4;
FileError.ENCODING_ERR = 5;
FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
FileError.INVALID_STATE_ERR = 7;
FileError.SYNTAX_ERR = 8;
FileError.INVALID_MODIFICATION_ERR = 9;
FileError.QUOTA_EXCEEDED_ERR = 10;
FileError.TYPE_MISMATCH_ERR = 11;
FileError.PATH_EXISTS_ERR = 12;


function File(name, fullPath, type, lastModifiedDate, size) {
    this.name = name || '';
    this.fullPath = fullPath || null;
    this.type = type || null;
    this.lastModifiedDate = lastModifiedDate || null;
    this.size = size || 0;
};

function Flags(create, exclusive) {
    this.create = create || false;
    this.exclusive = exclusive || false;
}



/**
 * Represents a file or directory on the local file system.
 *
 * @param isFile
 *            {boolean} true if Entry is a file (readonly)
 * @param isDirectory
 *            {boolean} true if Entry is a directory (readonly)
 * @param name
 *            {DOMString} name of the file or directory, excluding the path
 *            leading to it (readonly)
 * @param fullPath
 *            {DOMString} the absolute full path to the file or directory
 *            (readonly)
 */
function Entry(isFile, isDirectory, name, fullPath, fileSystem) {
    this.isFile = (typeof isFile != 'undefined' ? isFile : false);
    this.isDirectory = (typeof isDirectory != 'undefined' ? isDirectory : false);
    this.name = name || '';
    this.fullPath = fullPath || '';
    this.filesystem = fileSystem || null;
}

/**
 * Look up the metadata of the entry.
 *
 * @param successCallback
 *            {Function} is called with a Metadata object
 * @param errorCallback
 *            {Function} is called with a FileError
 */
Entry.prototype.getMetadata = function (successCallback, errorCallback) {
    var success = typeof successCallback !== 'function' ? null : function (lastModified) {
        var metadata = new Metadata(lastModified);
        successCallback(metadata);
    };
    var fail = typeof errorCallback !== 'function' ? null : function (code) {
        errorCallback(new FileError(code));
    };

    if (this.isFile) {
        Windows.Storage.StorageFile.getFileFromPathAsync(this.fullPath).done(function (storageFile) {
            storageFile.getBasicPropertiesAsync().then(function (basicProperties) {
                success(basicProperties.dateModified);
            }, function () {
                fail(FileError.NOT_READABLE_ERR);
            })
        }, function () {
            fail(FileError.NOT_READABLE_ERR);
        })
    }
    if (this.isDirectory) {
        Windows.Storage.StorageFolder.getFolderFromPathAsync(this.fullPath).done(function (storageFolder) {
            storageFolder.getBasicPropertiesAsync().then(function (basicProperties) {
                success(basicProperties.dateModified);
            }, function () {
                fail(FileError.NOT_FOUND_ERR);
            });
        }, function () {
            fail(FileError.NOT_READABLE_ERR);
        })
    }
   
};




/**
 * Move a file or directory to a new location.
 *
 * @param parent
 *            {DirectoryEntry} the directory to which to move this entry
 * @param newName
 *            {DOMString} new name of the entry, defaults to the current name
 * @param successCallback
 *            {Function} called with the new DirectoryEntry object
 * @param errorCallback
 *            {Function} called with a FileError
 */
Entry.prototype.moveTo = function (parent, newName, successCallback, errorCallback) {
    var fail = function (code) {
        if (typeof errorCallback === 'function') {
            errorCallback(new FileError(code));
        }
    };


    // user must specify parent Entry
    if (!parent) {
        fail(FileError.NOT_FOUND_ERR);
        return;
    }
    // source path
    var srcPath = this.fullPath,
        // entry name
        name = newName || this.name,
        success = function (entry) {
            if (entry) {
                if (typeof successCallback === 'function') {
                    // create appropriate Entry object
                    var result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
                    try {
                        successCallback(result);
                    }
                    catch (e) {
                        console.log('Error invoking callback: ' + e);
                    }
                }
            }
            else {
                // no Entry object returned
                fail(FileError.NOT_FOUND_ERR);
            }
        };
    
    //name can't be invalid
    if (String(name).match(new RegExp(/\?|\\|\*|\||\"|<|>|\:|\//g))) {
        fail(FileError.ENCODING_ERR);
        return;
    };

    var moveFiles = "";
    if (this.isFile) {
        moveFiles = function (srcPath, parentPath) {
            Windows.Storage.StorageFile.getFileFromPathAsync(srcPath).then(function (storageFile) {
                Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath).then(function (storageFolder) {
                    storageFile.moveAsync(storageFolder, name, Windows.Storage.NameCollisionOption.replaceExisting).then(function () {
                        success(new FileEntry(name, storageFile.path));
                    }, function () {
                        fail(FileError.INVALID_MODIFICATION_ERR);
                    });
                }, function () {
                    fail(FileError.NOT_FOUND_ERR);
                });
            },function () {
                fail(FileError.NOT_FOUND_ERR);
            })
        };
    }

    if (this.isDirectory) {
        moveFiles = eval(Jscex.compile('promise', function (srcPath, parentPath) {
            var storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(srcPath));
            var fileList =  $await(storageFolder.createFileQuery().getFilesAsync()); 
            if (fileList) {
                for (var i = 0; i < fileList.length; i++) {
                    var storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath));
                    $await(fileList[i].moveAsync(storageFolder));
                }
            }       
            var folderList = $await(storageFolder.createFolderQuery().getFoldersAsync());
            if (folderList.length == 0) { 
                //storageFolder.deleteAsync(); 
            } 
            else{
                for(var j = 0; j < folderList.length; j++){
                    var storageFolderTarget = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath));
                    var targetFolder = $await(storageFolderTarget.createFolderAsync(folderList[j].name));
                    $await(moveFiles(folderList[j].path, targetFolder.path));
                }
            }    
             
        }))
    }
   
    // move
    var isDirectory = this.isDirectory;
    var isFile = this.isFile;
    var moveFinish = eval(Jscex.compile("promise", function (srcPath, parentPath) {

        if (isFile) {
            //can't copy onto itself
            if (srcPath == parentPath + "\\" + name) {
                fail(FileError.INVALID_MODIFICATION_ERR);
                return;
            }
            moveFiles(srcPath, parent.fullPath);
        }
        if (isDirectory) {
            var originFolder = null;
            var storageFolder = null;
            try {
                originFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(srcPath));
                storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath));
                var newStorageFolder = $await(storageFolder.createFolderAsync(name, Windows.Storage.CreationCollisionOption.openIfExists));
                //can't move onto directory that is not empty
                var fileList = $await(newStorageFolder.createFileQuery().getFilesAsync());
                var folderList = $await(newStorageFolder.createFolderQuery().getFoldersAsync());
                if (fileList.length != 0 || folderList.length != 0) {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                    return;
                }
                //can't copy onto itself
                if (srcPath == newStorageFolder.path) {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                    return;
                }
                //can't copy into itself
                if (srcPath == parentPath) {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                    return;
                }
                $await(moveFiles(srcPath, newStorageFolder.path));
                var successCallback = function () { success(new DirectoryEntry(name, newStorageFolder.path)); }
                new DirectoryEntry(originFolder.name, originFolder.path).removeRecursively(successCallback, fail);
                
            } catch (e) {
               fail(FileError.INVALID_MODIFICATION_ERR);
            }
        }
    }));
    
    moveFinish(srcPath, parent.fullPath);
    
};



/**
 * Copy a directory to a different location.
 *
 * @param parent
 *            {DirectoryEntry} the directory to which to copy the entry
 * @param newName
 *            {DOMString} new name of the entry, defaults to the current name
 * @param successCallback
 *            {Function} called with the new Entry object
 * @param errorCallback
 *            {Function} called with a FileError
 */
Entry.prototype.copyTo = function (parent, newName, successCallback, errorCallback) {
    var fail = function (code) {
        if (typeof errorCallback === 'function') {
            errorCallback(new FileError(code));
        }
    };

    // user must specify parent Entry
    if (!parent) {
        fail(FileError.NOT_FOUND_ERR);
        return;
    }
    

    // source path
    var srcPath = this.fullPath,
        // entry name
        name = newName || this.name,
        // success callback
        success = function (entry) {
            if (entry) {
                if (typeof successCallback === 'function') {
                    // create appropriate Entry object
                    var result = (entry.isDirectory) ? new DirectoryEntry(entry.name, entry.fullPath) : new FileEntry(entry.name, entry.fullPath);
                    try {
                        successCallback(result);
                    }
                    catch (e) {
                        console.log('Error invoking callback: ' + e);
                    }
                }
            }
            else {
                // no Entry object returned
                fail(FileError.NOT_FOUND_ERR);
            }
        };
    //name can't be invalid
    if (String(name).match(new RegExp(/\?|\\|\*|\||\"|<|>|\:|\//g))) {
        fail(FileError.ENCODING_ERR);
        return;
    };
    // copy
    var copyFiles = "";
    if (this.isFile) {
        copyFiles = function (srcPath, parentPath) {
            Windows.Storage.StorageFile.getFileFromPathAsync(srcPath).then(function (storageFile) {
                Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath).then(function (storageFolder) {
                    storageFile.copyAsync(storageFolder, name, Windows.Storage.NameCollisionOption.failIfExists).then(function (storageFile) {
                        
                        success(new FileEntry(storageFile.name, storageFile.path));
                    }, function () {
                       
                        fail(FileError.INVALID_MODIFICATION_ERR);
                    });
                }, function () {
                    
                    fail(FileError.NOT_FOUND_ERR);
                });
            }, function () {
               
                fail(FileError.NOT_FOUND_ERR);
            })
        };
    }

    if (this.isDirectory) {
        copyFiles = eval(Jscex.compile('promise', function (srcPath, parentPath) {
            var storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(srcPath));
            var fileList = $await(storageFolder.createFileQuery().getFilesAsync());
            if (fileList) {
                for (var i = 0; i < fileList.length; i++) {
                    var storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath));
                    $await(fileList[i].copyAsync(storageFolder));
                }
            }
            var folderList = $await(storageFolder.createFolderQuery().getFoldersAsync());
            if (folderList.length == 0) {}
            else {
                for (var j = 0; j < folderList.length; j++) {
                    var storageFolderTarget = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath));
                    var targetFolder = $await(storageFolderTarget.createFolderAsync(folderList[j].name));
                    $await(copyFiles(folderList[j].path, targetFolder.path));
                }
            }

        }))
        
    }

    // copy
    var isFile = this.isFile;
    var isDirectory = this.isDirectory;
    var copyFinish = eval(Jscex.compile("promise", function (srcPath, parentPath) {
        if (isFile) {
            copyFiles(srcPath, parentPath);
        }
        if (isDirectory) {
            try {
                var storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath));
                var newStorageFolder = $await(storageFolder.createFolderAsync(name, Windows.Storage.CreationCollisionOption.openIfExists));
                //can't copy onto itself
                if (srcPath == newStorageFolder.path) {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                    return;
                }
                //can't copy into itself
                if (srcPath == parentPath) {
                    fail(FileError.INVALID_MODIFICATION_ERR);
                    return;
                }
                $await(copyFiles(srcPath, newStorageFolder.path));
                Windows.Storage.StorageFolder.getFolderFromPathAsync(newStorageFolder.path).done(function (storageFolder) {
                    success(new DirectoryEntry(storageFolder.name, storageFolder.path));
                },
                function () { fail(FileError.NOT_FOUND_ERR) })
            } catch (e) {
                
                fail(FileError.INVALID_MODIFICATION_ERR)
            }
            
        }
    }));
    copyFinish(srcPath, parent.fullPath);
};

/**
 * Return a URL that can be used to identify this entry.
 */
Entry.prototype.toURL = function () {
    // fullPath attribute contains the full URL
    return this.fullPath;
};

/**
 * Returns a URI that can be used to identify this entry.
 *
 * @param {DOMString} mimeType for a FileEntry, the mime type to be used to interpret the file, when loaded through this URI.
 * @return uri
 */
Entry.prototype.toURI = function (mimeType) {
    console.log("DEPRECATED: Update your code to use 'toURL'");
    // fullPath attribute contains the full URI
    return this.fullPath;
};

/**
 * Remove a file or directory. It is an error to attempt to delete a
 * directory that is not empty. It is an error to attempt to delete a
 * root directory of a file system.
 *
 * @param successCallback {Function} called with no parameters
 * @param errorCallback {Function} called with a FileError
 */
Entry.prototype.remove = function (successCallback, errorCallback) {
    
    var fail = typeof errorCallback !== 'function' ? null : function (code) {
        
        errorCallback(new FileError(code));
    };
    if (this.isFile) {
        Windows.Storage.StorageFile.getFileFromPathAsync(this.fullPath).done(function (storageFile) {
            storageFile.deleteAsync().done(successCallback, function () {
                fail(FileError.INVALID_MODIFICATION_ERR);

            });
        });
    }
    if (this.isDirectory) {
       
        var fullPath = this.fullPath;
        var removeEntry = eval(Jscex.compile('promise', function () {
            var storageFolder = null;
            try {
                storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath));
                
                //FileSystem root can't be removed!
                //todo: root could be changed
                var storageFolderPer = $await(Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("per", Windows.Storage.CreationCollisionOption.openIfExists));//Windows.Storage.ApplicationData.current.localFolder;
                var storageFolderTem = $await(Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("tem", Windows.Storage.CreationCollisionOption.openIfExists));//Windows.Storage.ApplicationData.current.temporaryFolder;
                if (fullPath == storageFolderPer.path || fullPath == storageFolderTem.path) {
                    fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
                    return;
                }
                storageFolder.createFileQuery().getFilesAsync().then(function (fileList) {

                    if (fileList.length == 0) {
                        storageFolder.createFolderQuery().getFoldersAsync().then(function (folderList) {

                            if (folderList.length == 0) {
                                storageFolder.deleteAsync().done(successCallback, function () {
                                    fail(FileError.INVALID_MODIFICATION_ERR);

                                });
                            } else {
                                fail(FileError.INVALID_MODIFICATION_ERR);
                            }
                        })
                    } else {
                        fail(FileError.INVALID_MODIFICATION_ERR);
                    }
                });
            }
            catch (e) {
               fail(FileError.INVALID_MODIFICATION_ERR);
            }   
            
        }))
        removeEntry();
    }
};

/**
 * Look up the parent DirectoryEntry of this entry.
 *
 * @param successCallback {Function} called with the parent DirectoryEntry object
 * @param errorCallback {Function} called with a FileError
 */
Entry.prototype.getParent = function (successCallback, errorCallback) {
    var win = typeof successCallback !== 'function' ? null : function (result) {
        var entry = new DirectoryEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = typeof errorCallback !== 'function' ? null : function (code) {
        errorCallback(new FileError(code));
    };
   
    var fullPath = this.fullPath;
    var getParentFinish = eval(Jscex.compile("promise", function () {
            //todo: root could be changed 
        var storageFolderPer = $await(Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("per", Windows.Storage.CreationCollisionOption.openIfExists));//Windows.Storage.ApplicationData.current.localFolder;
        var storageFolderTem = $await(Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("tem", Windows.Storage.CreationCollisionOption.openIfExists));//Windows.Storage.ApplicationData.current.temporaryFolder;
            
            if (fullPath == FileSystemPersistentRoot) {
                win(new DirectoryEntry(storageFolderPer.name, storageFolderPer.path));
                return;
            } else if (fullPath == FileSystemTemproraryRoot) {
                win(new DirectoryEntry(storageFolderTem.name, storageFolderTem.path));
                return;
            }
            var splitArr = fullPath.split(new RegExp(/\/|\\/g));
            
            var popItem = splitArr.pop();
            
            var result = new DirectoryEntry(popItem, fullPath.substr(0, fullPath.length - popItem.length - 1));
            Windows.Storage.StorageFolder.getFolderFromPathAsync(result.fullPath).done(
            function () { win(result) },
            function () { fail(FileError.INVALID_STATE_ERR) });
    }))
    getParentFinish();
    

};





function FileEntry(name, fullPath) {

    FileEntry.__super__.constructor.apply(this, [true, false, name, fullPath]);
  
};
utils.extend(FileEntry, Entry);
/**
 * Creates a new FileWriter associated with the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new FileWriter
 * @param {Function} errorCallback is called with a FileError
 */

FileEntry.prototype.createWriter = function (successCallback, errorCallback) {
    this.file(function (filePointer) {
        var writer = new FileWriter(filePointer);

        if (writer.fileName === null || writer.fileName === "") {
            if (typeof errorCallback === "function") {
                errorCallback(new FileError(FileError.INVALID_STATE_ERR));
            }
        } else {
            if (typeof successCallback === "function") {
                successCallback(writer);
            }
        }
    }, errorCallback);
};

/**
 * Returns a File that represents the current state of the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new File object
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.file = function (successCallback, errorCallback) {
    var win = typeof successCallback !== 'function' ? null : function (f) {
        var file = new File(f.name, f.fullPath, f.type, f.lastModifiedDate, f.size);
        successCallback(file);
    };
    var fail = typeof errorCallback !== 'function' ? null : function (code) {
        errorCallback(new FileError(code));
    };
    Windows.Storage.StorageFile.getFileFromPathAsync(this.fullPath).done(function (storageFile) {
        storageFile.getBasicPropertiesAsync().then(function (basicProperties) {
            win(new File(storageFile.name, storageFile.path, storageFile.fileType, basicProperties.dateModified, basicProperties.size));
        }, function () {

            fail(FileError.NOT_READABLE_ERR);
        })
    }, function () { fail(FileError.NOT_FOUND_ERR) })
};

/**
 * An interface representing a directory on the file system.
 *
 * {boolean} isFile always false (readonly)
 * {boolean} isDirectory always true (readonly)
 * {DOMString} name of the directory, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the directory (readonly)
 * {FileSystem} filesystem on which the directory resides (readonly)
 */
function DirectoryEntry(name, fullPath) {
    DirectoryEntry.__super__.constructor.apply(this, [false, true, name, fullPath]);
};


utils.extend(DirectoryEntry, Entry);

/**
     * Creates a new DirectoryReader to read entries from this directory
     */
DirectoryEntry.prototype.createReader = function () {
    return new DirectoryReader(this.fullPath);
};

/**
     * Creates or looks up a directory
     *
     * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a directory
     * @param {Flags} options to create or excluively create the directory
     * @param {Function} successCallback is called with the new entry
     * @param {Function} errorCallback is called with a FileError
     */
DirectoryEntry.prototype.getDirectory = function (path, options, successCallback, errorCallback) {
    var flag = "";
    if (options != null) {
        flag = new Flags(options.create, options.exclusive);
    } else {
        flag = new Flags(false, false);
    }
    
    
    var win = typeof successCallback !== 'function' ? null : function (result) {
        var entry = new DirectoryEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = typeof errorCallback !== 'function' ? null : function (code) {
        errorCallback(new FileError(code));
    };
    path = String(path).split(" ").join("\ ");
    
    Windows.Storage.StorageFolder.getFolderFromPathAsync(this.fullPath).then(function (storageFolder) {
        
        if (flag.create == true && flag.exclusive == true) {
           
            storageFolder.createFolderAsync(path, Windows.Storage.CreationCollisionOption.failIfExists).done(function (storageFolder) {
                win(new DirectoryEntry(storageFolder.name, storageFolder.path))
            }, function () {
                fail(FileError.PATH_EXISTS_ERR);
            })
        }
        else if (flag.create == true && flag.exclusive == false) {
           
            storageFolder.createFolderAsync(path, Windows.Storage.CreationCollisionOption.openIfExists).done(function (storageFolder) {
                win(new DirectoryEntry(storageFolder.name, storageFolder.path))
            }, function () {
                fail(FileError.INVALID_MODIFICATION_ERR);
            })
        }
        else if (flag.create == false) {
            if (String(path).match(new RegExp(/\?|\\|\*|\||\"|<|>|\:|\//g))) {
                fail(FileError.ENCODING_ERR);
                return;
            };
           
            storageFolder.getFolderAsync(path).done(function (storageFolder) {
                
                win(new DirectoryEntry(storageFolder.name, storageFolder.path))
            }, function () {
                fail(FileError.NOT_FOUND_ERR);
            })
        }

    }, function () {
        fail(FileError.NOT_FOUND_ERR)
    })

};

/**
     * Deletes a directory and all of it's contents
     *
     * @param {Function} successCallback is called with no parameters
     * @param {Function} errorCallback is called with a FileError
     */
DirectoryEntry.prototype.removeRecursively = function (successCallback, errorCallback) {
    var fail = typeof errorCallback !== 'function' ? null : function (code) {
        errorCallback(new FileError(code));
    };
    
    var removeFoldersCode = Jscex.compile('promise', function (path) {
       
        var storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(path));
        
        var fileList = $await(storageFolder.createFileQuery().getFilesAsync());
        
        if (fileList != null) {
            for (var i = 0; i < fileList.length; i++) {
                $await(fileList[i].deleteAsync());
                
            }
           
        }
        var folderList = $await(storageFolder.createFolderQuery().getFoldersAsync());
        if (folderList.length != 0) {
            for (var j = 0; j < folderList.length; j++) {

                $await(removeFolders(folderList[j].path));
               
            }
        }
        $await(storageFolder.deleteAsync());
    });

    var removeFolders = eval(removeFoldersCode);


    var fullPath = this.fullPath;

    var removeCompleteCode = Jscex.compile('promise', function (path) {
        
        //todo: root could be changed
        var storageFolderPer = $await(Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("per", Windows.Storage.CreationCollisionOption.openIfExists));//Windows.Storage.ApplicationData.current.localFolder;
        var storageFolderTem = $await(Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("tem", Windows.Storage.CreationCollisionOption.openIfExists));//Windows.Storage.ApplicationData.current.temporaryFolder;
            
        if (path == storageFolderPer.path || path == storageFolderTem.path) {
            fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
            return;
        }

        $await(removeFolders(path));

        try {
            
            $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(path));
        } catch (e) {

            if (typeof successCallback != 'undefined' && successCallback != null) { successCallback(); }

        }
    });

    var removeComplete = eval(removeCompleteCode);

    Windows.Storage.StorageFolder.getFolderFromPathAsync(fullPath).done(function (storageFolder) {
        removeComplete(storageFolder.path);
    }, function () {
       
        fail(FileError.NOT_FOUND_ERR);
    })

};

/**
     * Creates or looks up a file
     *
     * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a file
     * @param {Flags} options to create or excluively create the file
     * @param {Function} successCallback is called with the new entry
     * @param {Function} errorCallback is called with a FileError
     */
DirectoryEntry.prototype.getFile = function (path, options, successCallback, errorCallback) {
    var flag = "";
    if (options != null) {
        flag = new Flags(options.create, options.exclusive);
    } else {
        flag = new Flags(false, false);
    }
    
    var win = typeof successCallback !== 'function' ? null : function (result) {
        var entry = new FileEntry(result.name, result.fullPath);
        successCallback(entry);
    };
    var fail = typeof errorCallback !== 'function' ? null : function (code) {
        errorCallback(new FileError(code));
    };
    path = String(path).split(" ").join("\ ");
    
    Windows.Storage.StorageFolder.getFolderFromPathAsync(this.fullPath).then(function (storageFolder) {
        
        if (flag.create == true && flag.exclusive == true) {
            storageFolder.createFileAsync(path, Windows.Storage.CreationCollisionOption.failIfExists).done(function (storageFile) {
                win(new FileEntry(storageFile.name, storageFile.path))
            }, function () {

                fail(FileError.PATH_EXISTS_ERR);
            })
        }
        else if (flag.create == true && flag.exclusive == false) {
            
            storageFolder.createFileAsync(path, Windows.Storage.CreationCollisionOption.openIfExists).done(function (storageFile) {
                
                win(new FileEntry(storageFile.name, storageFile.path))
            }, function () {

                fail(FileError.INVALID_MODIFICATION_ERR);
            })
        }
        else if (flag.create == false) {
            if (String(path).match(new RegExp(/\?|\\|\*|\||\"|<|>|\:|\//g))) {
                fail(FileError.ENCODING_ERR);
                return;
            };
            storageFolder.getFileAsync(path).done(function (storageFile) {
                win(new FileEntry(storageFile.name, storageFile.path))
            }, function () {
                fail(FileError.NOT_FOUND_ERR);
            })
        }
    }, function () {
        fail(FileError.NOT_FOUND_ERR)
    })

};
var ProgressEvent = (function() {
  
        return function ProgressEvent(type, dict) {
            this.type = type;
            this.bubbles = false;
            this.cancelBubble = false;
            this.cancelable = false;
            this.lengthComputable = false;
            this.loaded = dict && dict.loaded ? dict.loaded : 0;
            this.total = dict && dict.total ? dict.total : 0;
            this.target = dict && dict.target ? dict.target : null;
        };
    
})();





/**
 * This class reads the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To read from the SD card, the file name is "sdcard/my_file.txt"
 * @constructor
 */
function FileReader() {
    this.fileName = "";

    this.readyState = 0; // FileReader.EMPTY

    // File data
    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onloadstart = null;    // When the read starts.
    this.onprogress = null;     // While reading (and decoding) file or fileBlob data, and reporting partial file data (progess.loaded/progress.total)
    this.onload = null;         // When the read has successfully completed.
    this.onerror = null;        // When the read has failed (see errors).
    this.onloadend = null;      // When the request has completed (either in success or failure).
    this.onabort = null;        // When the read has been aborted. For instance, by invoking the abort() method.
};

// States
FileReader.EMPTY = 0;
FileReader.LOADING = 1;
FileReader.DONE = 2;

/**
 * Abort reading file.
 */
FileReader.prototype.abort = function () {
    this.result = null;

    if (this.readyState == FileReader.DONE || this.readyState == FileReader.EMPTY) {
        return;
    }

    this.readyState = FileReader.DONE;

    // If abort callback
    if (typeof this.onabort === 'function') {
        this.onabort(new ProgressEvent('abort', { target: this }));
    }
    // If load end callback
    if (typeof this.onloadend === 'function') {
        this.onloadend(new ProgressEvent('loadend', { target: this }));
    }
};

/**
 * Read text file.
 *
 * @param file          {File} File object containing file properties
 * @param encoding      [Optional] (see http://www.iana.org/assignments/character-sets)
 */
FileReader.prototype.readAsText = function (file, encoding) {
    // Figure out pathing
    this.fileName = '';
    if (typeof file.fullPath === 'undefined') {
        this.fileName = file;
    } else {
        this.fileName = file.fullPath;
    }

    // Already loading something
    if (this.readyState == FileReader.LOADING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // LOADING state
    this.readyState = FileReader.LOADING;

    // If loadstart callback
    if (typeof this.onloadstart === "function") {
        this.onloadstart(new ProgressEvent("loadstart", { target: this }));
    }

    // Default encoding is UTF-8
    var enc = encoding ? encoding : "Utf8";

    var me = this;

    // Read file
   
        // Success callback
    var win = function (r) {
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileReader.DONE) {
            return;
        }

        // Save result
        me.result = r;

        // If onload callback
        if (typeof me.onload === "function") {
            me.onload(new ProgressEvent("load", { target: me }));
        }

        // DONE state
        me.readyState = FileReader.DONE;

        // If onloadend callback
        if (typeof me.onloadend === "function") {
            me.onloadend(new ProgressEvent("loadend", { target: me }));
        }
    };
        // Error callback
    var fail = function (e) {
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // null result
            me.result = null;

            // Save error
            me.error = new FileError(e);

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror(new ProgressEvent("error", { target: me }));
            }

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend(new ProgressEvent("loadend", { target: me }));
            }
    };
    Windows.Storage.StorageFile.getFileFromPathAsync(this.fileName).done(function (storageFile) {
        var value = Windows.Storage.Streams.UnicodeEncoding.utf8;
        if(enc == 'Utf16LE' || enc == 'utf16LE'){
            value = Windows.Storage.Streams.UnicodeEncoding.utf16LE;
        }else if(enc == 'Utf16BE' || enc == 'utf16BE'){
            value = Windows.Storage.Streams.UnicodeEncoding.utf16BE;
        }
        Windows.Storage.FileIO.readTextAsync(storageFile, value).done(function (fileContent) {
			win(fileContent);
        }, function () { fail(FileError.ENCODING_ERR) });
    }, function () { fail(FileError.NOT_FOUND_ERR) })
    

};


/**
 * Read file and return data as a base64 encoded data url.
 * A data url is of the form:
 *      data:[<mediatype>][;base64],<data>
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsDataURL = function (file) {
    this.fileName = "";
    if (typeof file.fullPath === "undefined") {
        this.fileName = file;
    } else {
        this.fileName = file.fullPath;
    }

    // Already loading something
    if (this.readyState == FileReader.LOADING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // LOADING state
    this.readyState = FileReader.LOADING;

    // If loadstart callback
    if (typeof this.onloadstart === "function") {
        this.onloadstart(new ProgressEvent("loadstart", { target: this }));
    }

    var me = this;

    // Read file
   
        // Success callback
    var win = function (r) {
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileReader.DONE) {
            return;
        }

        // DONE state
        me.readyState = FileReader.DONE;

        // Save result
        me.result = r;

        // If onload callback
        if (typeof me.onload === "function") {
            me.onload(new ProgressEvent("load", { target: me }));
        }

        // If onloadend callback
        if (typeof me.onloadend === "function") {
            me.onloadend(new ProgressEvent("loadend", { target: me }));
        }
    };
        // Error callback
    var fail = function (e) {
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileReader.DONE) {
            return;
        }

        // DONE state
        me.readyState = FileReader.DONE;

        me.result = null;

        // Save error
        me.error = new FileError(e);

        // If onerror callback
        if (typeof me.onerror === "function") {
            me.onerror(new ProgressEvent("error", { target: me }));
        }

        // If onloadend callback
        if (typeof me.onloadend === "function") {
            me.onloadend(new ProgressEvent("loadend", { target: me }));
        }
    };

    Windows.Storage.StorageFile.getFileFromPathAsync(this.fileName).then(function (storageFile) {
        /*storageFile.openAsync(Windows.Storage.FileAccessMode.read).then(function (readStream) {
            var dataReader = new Windows.Storage.Streams.DataReader(readStream);
            dataReader.loadAsync(readStream.size).done(function (numBytesLoaded) {
                var fileContent = dataReader.readString(numBytesLoaded);
                dataReader.close();
                var buffer = Windows.Security.Cryptography.CryptographicBuffer.decodeFromBase64String(fileContent);
                var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                var mediaType = storageFile.contentType;
                var result = "data:" + mediaType + ";base64," + strBase64;
                console.log(result);
                win(result);
                              
            });

        });*/
        Windows.Storage.FileIO.readBufferAsync(storageFile).done(function (buffer) {
            var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
            //the method encodeToBase64String will add "77u/" as a prefix, so we should remove it
            if(String(strBase64).substr(0,4) == "77u/"){
                strBase64 = strBase64.substr(4);
            }
            var mediaType = storageFile.contentType;
            var result = "data:" + mediaType + ";base64," + strBase64;
			win(result);
        })
 
    }, function () { fail(FileError.NOT_FOUND_ERR) });
  
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsBinaryString = function (file) {
    // TODO - Can't return binary data to browser.
    console.log('method "readAsBinaryString" is not supported in cordova API.');
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsArrayBuffer = function (file) {
    // TODO - Can't return binary data to browser.
    console.log('This method is not supported in cordova API.');
};





function DirectoryReader(path) {
    this.path = path || null;
}

/**
 * Returns a list of entries from a directory.
 *
 * @param {Function} successCallback is called with a list of entries
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryReader.prototype.readEntries = function (successCallback, errorCallback) {
    var win = typeof successCallback !== 'function' ? null : function (result) {
        var retVal = [];
        for (var i = 0; i < result.length; i++) {
            var entry = null;
           
            if (result[i].isDirectory) {
                entry = new DirectoryEntry();
            }
            else if (result[i].isFile) {
                entry = new FileEntry();
            }
            entry.isDirectory = result[i].isDirectory;
            entry.isFile = result[i].isFile;
            entry.name = result[i].name;
            entry.fullPath = result[i].fullPath;
            retVal.push(entry);
        }
        successCallback(retVal);
    };
    var fail = typeof errorCallback !== 'function' ? null : function (code) {
        errorCallback(new FileError(code));
    };
    var result = new Array();
    var path = this.path;
    var calcFinish = eval(Jscex.compile('promise', function () {
        try {
          
            var storageFolder = $await(Windows.Storage.StorageFolder.getFolderFromPathAsync(path));
            var fileList = $await(storageFolder.createFileQuery().getFilesAsync());
            if (fileList != null) {
                for (var i = 0; i < fileList.length; i++) {
                    result.push(new FileEntry(fileList[i].name, fileList[i].path));
                }
            }
            var folderList = $await(storageFolder.createFolderQuery().getFoldersAsync());
            if (folderList != null) {
                for (var j = 0; j < folderList.length; j++) {
                    result.push(new FileEntry(folderList[j].name,folderList[j].path));
                    
                }
            }
            win(result);

        } catch (e) { fail( FileError.NOT_FOUND_ERR)}
        
    }))

    calcFinish();
    
};

function FileWriter(file) {
    this.fileName = "";
    this.length = 0;
    if (file) {
        this.fileName = file.fullPath || file;
        this.length = file.size || 0;
    }
    // default is to write at the beginning of the file
    this.position = 0;

    this.readyState = 0; // EMPTY

    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onwritestart = null;   // When writing starts
    this.onprogress = null;     // While writing the file, and reporting partial file data
    this.onwrite = null;        // When the write has successfully completed.
    this.onwriteend = null;     // When the request has completed (either in success or failure).
    this.onabort = null;        // When the write has been aborted. For instance, by invoking the abort() method.
    this.onerror = null;        // When the write has failed (see errors).
};

// States
FileWriter.INIT = 0;
FileWriter.WRITING = 1;
FileWriter.DONE = 2;

/**
 * Abort writing file.
 */
FileWriter.prototype.abort = function () {
    // check for invalid state
    if (this.readyState === FileWriter.DONE || this.readyState === FileWriter.INIT) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // set error
    this.error = new FileError(FileError.ABORT_ERR);

    this.readyState = FileWriter.DONE;

    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort(new ProgressEvent("abort", { "target": this }));
    }

    // If write end callback
    if (typeof this.onwriteend === "function") {
        this.onwriteend(new ProgressEvent("writeend", { "target": this }));
    }
};

/**
 * Writes data to the file
 *
 * @param text to be written
 */
FileWriter.prototype.write = function (text) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", { "target": me }));
    }

    // Write file
  
        // Success callback
    var win = function (r) {
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileWriter.DONE) {
            return;
        }

        // position always increases by bytes written because file would be extended
        me.position += r;
        // The length of the file is now where we are done writing.

        me.length = me.position;

        // DONE state
        me.readyState = FileWriter.DONE;

        // If onwrite callback
        if (typeof me.onwrite === "function") {
            me.onwrite(new ProgressEvent("write", { "target": me }));
        }

        // If onwriteend callback
        if (typeof me.onwriteend === "function") {
            me.onwriteend(new ProgressEvent("writeend", { "target": me }));
        }
    };
        // Error callback
    var fail = function (e) {
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileWriter.DONE) {
            return;
        }

        // DONE state
        me.readyState = FileWriter.DONE;

        // Save error
        me.error = new FileError(e);

        // If onerror callback
        if (typeof me.onerror === "function") {
            me.onerror(new ProgressEvent("error", { "target": me }));
        }

        // If onwriteend callback
        if (typeof me.onwriteend === "function") {
            me.onwriteend(new ProgressEvent("writeend", { "target": me }));
        }
    }; 

    Windows.Storage.StorageFile.getFileFromPathAsync(this.fileName).done(function (storageFile) {
       
        Windows.Storage.FileIO.writeTextAsync(storageFile,text,Windows.Storage.Streams.UnicodeEncoding.utf8).done(function(){
            win(String(text).length);
        }, function () {
            fail(FileError.INVALID_MODIFICATION_ERR);
        });
    },function(){
        
        fail(FileError.NOT_FOUND_ERR)
    })
};

/**
 * Moves the file pointer to the location specified.
 *
 * If the offset is a negative number the position of the file
 * pointer is rewound.  If the offset is greater than the file
 * size the position is set to the end of the file.
 *
 * @param offset is the location to move the file pointer to.
 */
FileWriter.prototype.seek = function (offset) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    if (!offset && offset !== 0) {
        return;
    }

    // See back from end of file.
    if (offset < 0) {
        this.position = Math.max(offset + this.length, 0);
    }
        // Offset is bigger then file size so set position
        // to the end of the file.
    else if (offset > this.length) {
        this.position = this.length;
    }
            // Offset is between 0 and file size so set the position
            // to start writing.
    else {
        this.position = offset;
    }
};

/**
 * Truncates the file to the size specified.
 *
 * @param size to chop the file at.
 */
FileWriter.prototype.truncate = function (size) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw new FileError(FileError.INVALID_STATE_ERR);
    }

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart(new ProgressEvent("writestart", { "target": this }));
    }

    // Write file
  
        // Success callback
    var win = function (r) {
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileWriter.DONE) {
            return;
        }

        // DONE state
        me.readyState = FileWriter.DONE;

        // Update the length of the file
        me.length = r;
        me.position = Math.min(me.position, r);

        // If onwrite callback
        if (typeof me.onwrite === "function") {
            me.onwrite(new ProgressEvent("write", { "target": me }));
        }

        // If onwriteend callback
        if (typeof me.onwriteend === "function") {
            me.onwriteend(new ProgressEvent("writeend", { "target": me }));
        }
    };
        // Error callback
    var fail = function (e) {
        // If DONE (cancelled), then don't do anything
        if (me.readyState === FileWriter.DONE) {
            return;
        }

        // DONE state
        me.readyState = FileWriter.DONE;

        // Save error
        me.error = new FileError(e);

        // If onerror callback
        if (typeof me.onerror === "function") {
            me.onerror(new ProgressEvent("error", { "target": me }));
        }

        // If onwriteend callback
        if (typeof me.onwriteend === "function") {
            me.onwriteend(new ProgressEvent("writeend", { "target": me }));
        }
    };
    
    Windows.Storage.StorageFile.getFileFromPathAsync(this.fileName).done(function(storageFile){
        //the current length of the file , modified in the Jscex method
        var leng = 0;
        var truncateProgress = eval(Jscex.compile('promise', function () {
            var basicProperties = $await(storageFile.getBasicPropertiesAsync());
            leng = basicProperties.size;
            if (Number(size) >= leng) {
                win(this.length);
                return;
            }
            if (Number(size) >= 0) {
                Windows.Storage.FileIO.readTextAsync(storageFile, Windows.Storage.Streams.UnicodeEncoding.utf8).then(function (fileContent) {
                    fileContent = fileContent.substr(0, size);
                    var fullPath = storageFile.path;
                    var name = storageFile.name;
                    var entry = new Entry(true, false, name, fullPath);
                    var parentPath = "";
                    do {
                        var successCallBack = function (entry) {
                            parentPath = entry.fullPath;
                        }
                        entry.getParent(successCallBack, null);
                    }
                    while (parentPath == "");
                    storageFile.deleteAsync().then(function () {
                        Windows.Storage.StorageFolder.getFolderFromPathAsync(parentPath).then(function (storageFolder) {
                            storageFolder.createFileAsync(name).then(function (newStorageFile) {
                                Windows.Storage.FileIO.writeTextAsync(newStorageFile, fileContent).done(function () {
                                    win(String(fileContent).length);
                                }, function () {
                                    fail(FileError.NO_MODIFICATION_ALLOWED_ERR);
                                });
                            })
                        })
                    })

                }, function () { fail(FileError.NOT_FOUND_ERR) });

            }
        }));
        truncateProgress();
    }, function () { fail(FileError.NOT_FOUND_ERR) })

};
