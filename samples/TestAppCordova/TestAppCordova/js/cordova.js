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


/**
 * This contains device acceleration information.
 * @param {Object} x
 * @param {Object} y
 * @param {Object} z
 * @param {Object} timestamp
 * @constructor
 */
function Acceleration(x, y, z, timestamp) {
    /**
	 * The x acceleration of the device.
	 */
    this.x = x;
    /**
	 * The y acceleration of the device.
	 */
    this.y = y;
    /**
	 * The z acceleration of the device.
	 */
    this.z = z;
    /**
	 * The timestamp for the accelerations of the device.
	 */
    this.timestamp = timestamp || new Date().getTime();
};

var accelerometerTimers = {};	// list of timers in use

// Returns default param, overrides if provided with value
function accelerometerOptions(options) {
    var opt = {
        frequency: 10000
    };
    if (options) {
        if (options.frequency !== undefined) {
            opt.frequency = options.frequency;
        }
    }
    return opt;
}


/*
 * This class provides access to device acceleration data.
 * @constructor
 */
function Accelerometer() { }


/**
 * Aquires the current 3d acceleration.
 *
 * @param {Function} accelerometerSuccess	The Function to call when the acceleration data is available
 * @param {Function} accelerometerError		The function to call when there is an error getting the acceleration data
 */
Accelerometer.prototype.getCurrentAcceleration = function (accelerometerSuccess, accelerometerError) {
    var win = function (a) {
        accelerometerSuccess(new Acceleration(a.accelerationX,
											  a.accelerationY,
											  a.accelerationZ,
											  a.timestamp
							 )
        )
    };

    var fail = function () {
        accelerometerError();
    };

    var accel = Windows.Devices.Sensors.Accelerometer.getDefault();

    var reading = accel.getCurrentReading();
    if (reading) {
        win(reading);
    } else {
        fail();
    }
};

/**
 * Watches the acceleration. Calls acceleromterSuccess at a regular time interval
 * defined in options.
 *
 * @param {Function} accelerometerSuccess	The function to call at the regular interval.
 * @param {Function} accelerometerError		The function to call when there is an error getting the acceleartion data.
 * @param {accelerationOptions} options		The option for frequency to call accelerometerSuccess. (OPTIONAL)
 * @return String							The watch id that must be passed to #clearWatch to stop watching.
 */

Accelerometer.prototype.watchAcceleration = function (accelerometerSuccess, accelerometerError, options) {
    options = accelerometerOptions(options);

    var id = createUUID();
    accelerometerTimers[id] = window.setInterval(function () {
        navigator.accelerometer.getCurrentAcceleration(accelerometerSuccess, accelerometerError);
    }, options.frequency);

    return id;
};

/**
 * Stop watching the acceleration referenced by the watchId param.
 *
 * @param {String} id		The ID of the watch returned from #watchAcceleration
 */

Accelerometer.prototype.clearWatch = function (watchId) {
    if (watchId && accelerometerTimers[watchId] !== undefined) {
        window.clearInterval(accelerometerTimers[watchId]);
        delete accelerometerTimers[id];
    }
};

if (typeof navigator.accelerometer == "undefined") {
    // Win RT support the object Accelerometer , and is Read-Only , So for test , must to change the methods of Object
    //navigator.accelerometer.getCurrentAcceleration = new Accelerometer().getCurrentAcceleration;
    //navigator.accelerometer.clearWatch = new Accelerometer().clearWatch;
    //navigator.accelerometer.watchAcceleration = new Accelerometer().watchAcceleration;
    navigator.accelerometer = new Accelerometer();
}
/**
 * This class provides access to the device camera.
 *
 * @constructor
 */
function Camera() {
    this.successCallback = null;
    this.errorCallback = null;
    this.options = null;
};

/**
 * Format of image that returned from getPicture.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
 */
Camera.DestinationType = {
    DATA_URL: 0,                // Return base64 encoded string
    FILE_URI: 1                 // Return file uri (content://media/external/images/media/2 for Android)
};
Camera.prototype.DestinationType = Camera.DestinationType;

/**
 * Encoding of image returned from getPicture.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.CAMERA,
 *                encodingType: Camera.EncodingType.PNG})
*/
Camera.EncodingType = {
    JPEG: 0,                    // Return JPEG encoded image
    PNG: 1                      // Return PNG encoded image
};
Camera.prototype.EncodingType = Camera.EncodingType;

/**
 * Source to getPicture from.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
 */
Camera.PictureSourceType = {
    PHOTOLIBRARY: 0,           // Choose image from picture library (same as SAVEDPHOTOALBUM for Android)
    CAMERA: 1,                 // Take picture from camera
    SAVEDPHOTOALBUM: 2         // Choose image from picture library (same as PHOTOLIBRARY for Android)
};
Camera.prototype.PictureSourceType = Camera.PictureSourceType;

Camera.MediaType = {
    PICTURE: 0,          // allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType
    VIDEO: 1,            // allow selection of video only, ONLY RETURNS URL
    ALLMEDIA: 2         // allow selection from all media types
};
Camera.prototype.MediaType = Camera.MediaType;

/**
 * Gets a picture from source defined by "options.sourceType", and returns the
 * image as defined by the "options.destinationType" option.

 * The defaults are sourceType=CAMERA and destinationType=DATA_URL.
 *
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
Camera.prototype.getPicture = function (successCallback, errorCallback, options) {
    
    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Camera Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Camera Error: errorCallback is not a function");
        return;
    }
    
    var quality = 50;
    if (options && typeof options.quality == "number") {
        quality = options.quality;
    } else if (options && typeof options.quality == "string") {
        var qlity = parseInt(options.quality, 10);
        if (isNaN(qlity) === false) {
            quality = qlity.valueOf();
        }
    }

    var destinationType = Camera.DestinationType.FILE_URI;
    if (typeof options.destinationType == "number") {
        destinationType = options.destinationType;
    }

    var sourceType = Camera.PictureSourceType.CAMERA;
    if (typeof options.sourceType == "number") {
        sourceType = options.sourceType;
    }

    var targetWidth = -1;
    if (typeof options.targetWidth == "number") {
        targetWidth = options.targetWidth;
    } else if (typeof options.targetWidth == "string") {
        var width = parseInt(options.targetWidth, 10);
        if (isNaN(width) === false) {
            targetWidth = width.valueOf();
        }
    }

    var targetHeight = -1;
    if (typeof options.targetHeight == "number") {
        targetHeight = options.targetHeight;
    } else if (typeof options.targetHeight == "string") {
        var height = parseInt(options.targetHeight, 10);
        if (isNaN(height) === false) {
            targetHeight = height.valueOf();
        }
    }

    if ((targetWidth > 0 && targetHeight < 0) || (targetWidth < 0 && targetHeight > 0)) {
        errorCallback("targetWidth should be used with targetHeight.");
    }

    var encodingType = Camera.EncodingType.JPEG;
    if (typeof options.encodingType == "number") {
        encodingType = options.encodingType;
    }

    var mediaType = Camera.MediaType.PICTURE;
    if (typeof options.mediaType == "number") {
        mediaType = options.mediaType;
    }
    var allowEdit = false;
    if (typeof options.allowEdit == "boolean") {
        allowEdit = options.allowEdit;
    } else if (typeof options.allowEdit == "number") {
        allowEdit = options.allowEdit <= 0 ? false : true;
    }
    var correctOrientation = false;
    if (typeof options.correctOrientation == "boolean") {
        correctOrientation = options.correctOrientation;
    } else if (typeof options.correctOrientation == "number") {
        correctOrientation = options.correctOrientation <= 0 ? false : true;
    }
    var saveToPhotoAlbum = false;
    if (typeof options.saveToPhotoAlbum == "boolean") {
        saveToPhotoAlbum = options.saveToPhotoAlbum;
    } else if (typeof options.saveToPhotoAlbum == "number") {
        saveToPhotoAlbum = options.saveToPhotoAlbum <= 0 ? false : true;
    }

    
    // get the path of photo album.
    /*var parentPath
    var username = Windows.System.UserProfile.UserInformation.getDisplayNameAsync().then(function (displayName) { 
        parentPath = "C:\\Users\\" + username + "\\Pictures";
    });*/
    var package = Windows.ApplicationModel.Package.current;
    var packageId = package.installedLocation;

    // resize method :)
    var resizeImage = function (file) {
        var tempPhotoFileName = "";
        if (encodingType == Camera.EncodingType.PNG) {
            tempPhotoFileName = "camera_cordova_temp_return.png";
        } else {
            tempPhotoFileName = "camera_cordova_temp_return.jpg";
        }
        var imgObj = new Image();
        var success = function (fileEntry) {
            var successCB = function (filePhoto) {
                var filePhoto = filePhoto,
                    fileType = file.contentType,
                    reader = new FileReader();
                reader.onloadend = function () {
                    var image = new Image();
                    image.src = reader.result;
                    image.onload = function () {
                        var imageWidth = targetWidth,
                            imageHeight = targetHeight;
                        var canvas = document.createElement('canvas');
                                            
                        canvas.width = imageWidth;
                        canvas.height = imageHeight;

                        var ctx = canvas.getContext("2d");
                        ctx.drawImage(this, 0, 0, imageWidth, imageHeight);
                                            
                        // The resized file ready for upload
                        var finalFile = canvas.toDataURL(fileType);
                        Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                            storageFolder.createFileAsync(tempPhotoFileName, Windows.Storage.CreationCollisionOption.generateUniqueName).done(function (file) {
                                var arr = finalFile.split(",");
                                var newStr = finalFile.substr(arr[0].length + 1);

                                var buffer = Windows.Security.Cryptography.CryptographicBuffer.decodeFromBase64String(newStr);
                                Windows.Storage.FileIO.writeBufferAsync(file, buffer).done(function () {
                                    successCallback(file.name);
                                                        
                                }, function () { errorCallback("Resize picture error.");})
                            }, function () { errorCallback("Resize picture error."); })
                                                
                        }, function () { errorCallback("Resize picture error."); })
                    }
                }

                reader.readAsDataURL(filePhoto);

            }
            var failCB = function () {
                errorCallback("File not found.")
            }
            fileEntry.file(successCB, failCB);
        }
 
        var fail = function (fileError) {
            errorCallback("FileError, code:" + fileError.code);
        }
        Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
            file.copyAsync(storageFolder, file.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                success(new FileEntry(storageFile.name, storageFile.path));
            }, function () {
                fail(FileError.INVALID_MODIFICATION_ERR);
            }, function () {
                errorCallback("Folder not access.");
            });
        })
                        
    }

    // because of asynchronous method, so let the successCallback be called in it. 
    var resizeImageBase64 = function (file) {
        var imgObj = new Image();
        var success = function (fileEntry) {
            var successCB = function (filePhoto) {
                var filePhoto = filePhoto,
                    fileType = file.contentType,
                    reader = new FileReader();
                reader.onloadend = function () {
                    var image = new Image();
                    image.src = reader.result;

                    image.onload = function () {
                        var imageWidth = targetWidth,
                            imageHeight = targetHeight;
                        var canvas = document.createElement('canvas');

                        canvas.width = imageWidth;
                        canvas.height = imageHeight;

                        var ctx = canvas.getContext("2d");
                        ctx.drawImage(this, 0, 0, imageWidth, imageHeight);

                        // The resized file ready for upload
                        var finalFile = canvas.toDataURL(fileType);

                        // Remove the prefix such as "data:" + contentType + ";base64," , in order to meet the Cordova API.
                        var arr = finalFile.split(",");
                        var newStr = finalFile.substr(arr[0].length + 1);
                        successCallback(newStr);
                    }
                }

                reader.readAsDataURL(filePhoto);

            }
            var failCB = function () {
                errorCallback("File not found.")
            }
            fileEntry.file(successCB, failCB);
        }

        var fail = function (fileError) {
            errorCallback("FileError, code:" + fileError.code);
        }
        Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
            file.copyAsync(storageFolder, file.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                success(new FileEntry(storageFile.name, storageFile.path));
            }, function () {
                fail(FileError.INVALID_MODIFICATION_ERR);
            }, function () {
                errorCallback("Folder not access.");
            });
        })

    }

    if (sourceType != Camera.PictureSourceType.CAMERA) {
        var fileOpenPicker = new Windows.Storage.Pickers.FileOpenPicker();
        fileOpenPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
        if (mediaType == Camera.MediaType.PICTURE) {
            fileOpenPicker.fileTypeFilter.replaceAll([".png", ".jpg", ".jpeg"]);
        } else if (mediaType == Camera.MediaType.VIDEO) {
            fileOpenPicker.fileTypeFilter.replaceAll([".avi", ".flv", ".asx", ".asf", ".mov", ".mp4", ".mpg", ".rm", ".srt", ".swf", ".wmv", ".vob"]);
        } else {
            fileOpenPicker.fileTypeFilter.replaceAll(["*"]);
        }    
        fileOpenPicker.pickSingleFileAsync().then(function (file) {
            if (file) {
                if (destinationType == Camera.DestinationType.FILE_URI) {
                    if (targetHeight > 0 && targetWidth > 0) {
                        resizeImage(file);
                    } else {
                        Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                            file.copyAsync(storageFolder, file.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                                successCallback(storageFile.name);
                            }, function () {
                                fail(FileError.INVALID_MODIFICATION_ERR);
                            }, function () {
                                errorCallback("Folder not access.");
                            });
                        })
                        
                    }
                }
                else {
                    if (targetHeight > 0 && targetWidth > 0) {
                        resizeImageBase64(file);
                    } else {
                        Windows.Storage.FileIO.readBufferAsync(file).done(function (buffer) {
                            var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                            successCallback(strBase64);
                        })
                    }
                    
                }

            } else {
                errorCallback("User didn't choose a file.");
            }
        }, function () {
            errorCallback("User didn't choose a file.")
        })
    }
    else {
        
        var cameraCaptureUI = new Windows.Media.Capture.CameraCaptureUI();
        cameraCaptureUI.photoSettings.allowCropping = true;
        if (encodingType == Camera.EncodingType.PNG) {
            cameraCaptureUI.photoSettings.format = Windows.Media.Capture.CameraCaptureUIPhotoFormat.png;
        } else {
            cameraCaptureUI.photoSettings.format = Windows.Media.Capture.CameraCaptureUIPhotoFormat.jpeg;
        }
        // decide which max pixels should be supported by targetWidth or targetHeight.
        if (targetWidth >= 1280 || targetHeight >= 960) {
            cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.large3M;
        } else if (targetWidth >= 1024 || targetHeight >= 768) {
            cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.mediumXga;
        } else if (targetWidth >= 800 || targetHeight >= 600) {
            cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.mediumXga;
        } else if (targetWidth >= 640 || targetHeight >= 480) {
            cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.smallVga;
        } else if (targetWidth >= 320 || targetHeight >= 240) {
            cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.verySmallQvga;
        } else {
            cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.highestAvailable;
        }
        
        cameraCaptureUI.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.photo).then(function (picture) {
            if (picture) {
                // save to photo album successCallback
                var success = function (fileEntry) {
                    if (destinationType == Camera.DestinationType.FILE_URI) {
                        if (targetHeight > 0 && targetWidth > 0) {
                            resizeImage(picture);
                        } else {
                            Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                                picture.copyAsync(storageFolder, picture.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                                    successCallback(storageFile.name);
                                }, function () {
                                    fail(FileError.INVALID_MODIFICATION_ERR);
                                }, function () {
                                    errorCallback("Folder not access.");
                                });
                            })
                        }
                    } else {
                        if (targetHeight > 0 && targetWidth > 0) {
                            resizeImageBase64(picture);
                        } else {
                            Windows.Storage.FileIO.readBufferAsync(picture).done(function (buffer) {
                                var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                                successCallback(strBase64);
                            })
                        }
                    }
                }
                // save to photo album errorCallback
                var fail = function () {
                    //errorCallback("FileError, code:" + fileError.code);
                    errorCallback("Save fail.");
                }

                if (saveToPhotoAlbum) {
                    Windows.Storage.StorageFile.getFileFromPathAsync(picture.path).then(function (storageFile) {
                        storageFile.copyAsync(Windows.Storage.KnownFolders.picturesLibrary, picture.name, Windows.Storage.NameCollisionOption.generateUniqueName).then(function (storageFile) {
                            success(storageFile);
                        }, function () {
                            fail();
                        })
                    })
                    //var directory = new DirectoryEntry("Pictures", parentPath);
                    //new FileEntry(picture.name, picture.path).copyTo(directory, null, success, fail);
                } else {
                    if (destinationType == Camera.DestinationType.FILE_URI) {
                        if (targetHeight > 0 && targetWidth > 0) {
                            resizeImage(picture);
                        } else {
                            Windows.Storage.StorageFolder.getFolderFromPathAsync(packageId.path).done(function (storageFolder) {
                                picture.copyAsync(storageFolder, picture.name, Windows.Storage.NameCollisionOption.replaceExisting).then(function (storageFile) {
                                    successCallback(storageFile.name);
                                }, function () {
                                    fail(FileError.INVALID_MODIFICATION_ERR);
                                }, function () {
                                    errorCallback("Folder not access.");
                                });
                            })
                        }
                    } else {
                        if (targetHeight > 0 && targetWidth > 0) {
                            resizeImageBase64(picture);
                        } else {
                            Windows.Storage.FileIO.readBufferAsync(picture).done(function (buffer) {
                                var strBase64 = Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(buffer);
                                successCallback(strBase64);
                            })
                        }
                    }
                }
            } else {
                errorCallback("User didn't capture a photo.");
            }
        }, function () {
            errorCallback("Fail to capture a photo.");
        })
    }
};

if (typeof navigator.camera === "undefined") {
    navigator.camera = new Camera();
} /**
 * Encapsulates all audio capture operation configuration options.
 */
function CaptureAudioOptions() {
    // Upper limit of sound clips user can record. Value must be equal or greater than 1.
    this.limit = 1;
    // Maximum duration of a single sound clip in seconds.
    this.duration = 0;
    // The selected audio mode. Must match with one of the elements in supportedAudioModes array.
    this.mode = null;
};

 /**
 * The CaptureError interface encapsulates all errors in the Capture API.
 */
function CaptureError(c) {
    this.code = c || null;
};

// Camera or microphone failed to capture image or sound.
CaptureError.CAPTURE_INTERNAL_ERR = 0;
// Camera application or audio capture application is currently serving other capture request.
CaptureError.CAPTURE_APPLICATION_BUSY = 1;
// Invalid use of the API (e.g. limit parameter has value less than one).
CaptureError.CAPTURE_INVALID_ARGUMENT = 2;
// User exited camera application or audio capture application before capturing anything.
CaptureError.CAPTURE_NO_MEDIA_FILES = 3;
// The requested capture operation is not supported.
CaptureError.CAPTURE_NOT_SUPPORTED = 20;


 /**
 * Encapsulates all image capture operation configuration options.
 */
function CaptureImageOptions() {
    // Upper limit of images user can take. Value must be equal or greater than 1.
    this.limit = 1;
    // The selected image mode. Must match with one of the elements in supportedImageModes array.
    this.mode = null;
};


 /**
 * Encapsulates all video capture operation configuration options.
 */
function CaptureVideoOptions() {
    // Upper limit of videos user can record. Value must be equal or greater than 1.
    this.limit = 1;
    // Maximum duration of a single video clip in seconds.
    this.duration = 0;
    // The selected video mode. Must match with one of the elements in supportedVideoModes array.
    this.mode = null;
};

/**
 * Represents a single file.
 *
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */
function MediaFile(name, fullPath, type, lastModifiedDate, size) {
    MediaFile.__super__.constructor.apply(this, arguments);
};

utils.extend(MediaFile, File);

/**
 * Request capture format data for a specific file and type
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 */
MediaFile.prototype.getFormatData = function (successCallback, errorCallback) {
    var contentType = this.type;
    if (typeof this.fullPath === "undefined" || this.fullPath === null) {
        errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
    } else {
        Windows.Storage.StorageFile.getFileFromPathAsync(this.fullPath).then(function (storageFile) {
            var mediaTypeFlag = String(contentType).split("/")[0].toLowerCase();
            if (mediaTypeFlag === "audio") {
                storageFile.properties.getMusicPropertiesAsync().then(function (audioProperties) {
                    successCallback(new MediaFileData(null, audioProperties.bitrate, 0, 0, audioProperties.duration/1000));
                }, function () {
                    errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                })
            }
            else if (mediaTypeFlag === "video") {
                storageFile.properties.getVideoPropertiesAsync().then(function (videoProperties) {
                    successCallback(new MediaFileData(null, videoProperties.bitrate, videoProperties.height, videoProperties.width, videoProperties.duration/1000));
                }, function () {
                    errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                })
            }
            else if (mediaTypeFlag === "image") {
                storageFile.properties.getImagePropertiesAsync().then(function (imageProperties) {
                    successCallback(new MediaFileData(null, 0, imageProperties.height, imageProperties.width, 0));
                }, function () {
                    errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
                })
            }
            else { errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT)) }
        }, function () {
            errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
        })
    }
};

/**
 * MediaFileData encapsulates format information of a media file.
 *
 * @param {DOMString} codecs
 * @param {long} bitrate
 * @param {long} height
 * @param {long} width
 * @param {float} duration
 */
function MediaFileData (codecs, bitrate, height, width, duration) {
    this.codecs = codecs || null;
    this.bitrate = bitrate || 0;
    this.height = height || 0;
    this.width = width || 0;
    this.duration = duration || 0;
};
/**
 * The Capture interface exposes an interface to the camera and microphone of the hosting device.
 */
function Capture() {
    this.supportedAudioModes = [];
    this.supportedImageModes = ["image/jpeg", "image/png"];
    this.supportedVideoModes = ["video/mp4", "video/wmv"];
}

/**
 * Launch audio recorder application for recording audio clip(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureAudioOptions} options
 */

// No UI support. The duration of the audio recording.
var cameraCaptureAudioDuration;
Capture.prototype.captureAudio = function (successCallback, errorCallback, options) {
    var audioOptions = new CaptureAudioOptions();
    if (options.duration && options.duration > 0) {
        audioOptions.duration = options.duration;
        cameraCaptureAudioDuration = audioOptions.duration;
    } else {
        errorCallback(new CaptureError(CaptureError.CAPTURE_INVALID_ARGUMENT));
        return;
    }
    var mediaCaputreSettings;
    var initCaptureSettings = function () {
        mediaCaputreSettings = null;
        mediaCaputreSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
        mediaCaputreSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.audio;
    }
    initCaptureSettings();
    var mediaCapture = new Windows.Media.Capture.MediaCapture();
    mediaCapture.initializeAsync(mediaCaputreSettings).done(function () {
        Windows.Storage.KnownFolders.musicLibrary.createFileAsync("captureAudio.mp3", Windows.Storage.NameCollisionOption.generateUniqueName).then(function (storageFile) {
            var mediaEncodingProfile = new Windows.Media.MediaProperties.MediaEncodingProfile.createMp3(Windows.Media.MediaProperties.AudioEncodingQuality.auto);
            var stopRecord = function () {
                mediaCapture.stopRecordAsync().then(function (result) {
                    storageFile.getBasicPropertiesAsync().then(function (basicProperties) {
                        successCallback(new MediaFile(storageFile.name, storageFile.path, storageFile.contentType, basicProperties.dateModified, basicProperties.size));
                    }, function () {
                        errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
                    })
                }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); })
            }
            mediaCapture.startRecordToStorageFileAsync(mediaEncodingProfile, storageFile).then(function () {
                setTimeout(stopRecord, cameraCaptureAudioDuration*1000);
            }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); })
        }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); })
    })
};

/**
 * Launch camera application for taking image(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureImageOptions} options
 */
Capture.prototype.captureImage = function (successCallback, errorCallback, options) {
    var imageOptions = new CaptureImageOptions();
    var cameraCaptureUI = new Windows.Media.Capture.CameraCaptureUI();
    cameraCaptureUI.photoSettings.allowCropping = true;
    cameraCaptureUI.photoSettings.maxResolution = Windows.Media.Capture.CameraCaptureUIMaxPhotoResolution.highestAvailable;
    cameraCaptureUI.photoSettings.format = Windows.Media.Capture.CameraCaptureUIPhotoFormat.jpeg;
    cameraCaptureUI.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.photo).then(function (file) {
        file.moveAsync(Windows.Storage.KnownFolders.picturesLibrary, "cameraCaptureImage.jpg", Windows.Storage.NameCollisionOption.generateUniqueName).then(function () {
            file.getBasicPropertiesAsync().then(function (basicProperties) {
                successCallback(new MediaFile(file.name, file.path, file.contentType, basicProperties.dateModified, basicProperties.size));
            }, function () {
                errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
            })
        }, function () {
            errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
        });
    }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); })
};

/**
 * Launch device camera application for recording video(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
Capture.prototype.captureVideo = function (successCallback, errorCallback, options) {
    var videoOptions = new CaptureVideoOptions();
    if (options.duration && options.duration > 0) {
        videoOptions.duration = options.duration;
    }
    if (options.limit > 1) {
        videoOptions.limit = options.limit;
    }
    var cameraCaptureUI = new Windows.Media.Capture.CameraCaptureUI();
    cameraCaptureUI.videoSettings.allowTrimming = true;
    cameraCaptureUI.videoSettings.format = Windows.Media.Capture.CameraCaptureUIVideoFormat.mp4;
    cameraCaptureUI.videoSettings.maxDurationInSeconds = videoOptions.duration;
    cameraCaptureUI.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.video).then(function (file) {
        file.moveAsync(Windows.Storage.KnownFolders.videosLibrary, "cameraCaptureVedio.mp4", Windows.Storage.NameCollisionOption.generateUniqueName).then(function () {
            file.getBasicPropertiesAsync().then(function (basicProperties) {
                successCallback(new MediaFile(file.name, file.path, file.contentType, basicProperties.dateModified, basicProperties.size));
            }, function () {
                errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
            })
        }, function () {
            errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES));
        });
    }, function () { errorCallback(new CaptureError(CaptureError.CAPTURE_NO_MEDIA_FILES)); })
};


/**
 * Encapsulates a set of parameters that the capture device supports.
 */
function ConfigurationData() {
    // The ASCII-encoded string in lower case representing the media type.
    this.type = null;
    // The height attribute represents height of the image or video in pixels.
    // In the case of a sound clip this attribute has value 0.
    this.height = 0;
    // The width attribute represents width of the image or video in pixels.
    // In the case of a sound clip this attribute has value 0
    this.width = 0;
}

// Just for test(because of the unimplementation of channnel and device)
function Device() { }

if (typeof navigator.device === "undefined") {
    navigator.device = new Device();
}

if (typeof navigator.device.capture === "undefined") {
    navigator.device.capture = new Capture();
}/**
 * This class contains compass information.
 * @param {Object} magnHead		Magnetic heading
 * @param {Object} trueHead		True heading
 * @param {Object} headAcc		Heading accuracy
 * @param {Object} timeSt		Timestamp
 */
function CompassHeading(magnHead, trueHead, headAcc, timeSt) {
    /**
	 * The magnetic north heading of the compass.
	 */
    this.magneticHeading = magnHead || 0;
    /**
	 * The heading of the compass relative to the geographic North Pole.
	 */
    this.trueHeading = trueHead || this.magneticHeading;
    /**
	 * The deviation between the report heading and the true heading of the compass.
	 */
    this.headingAccuracy = headAcc || 0;
    /**
	 * The time at which the heading was determined.
	 */
    this.timestamp = (timeSt !== undefined) ? timeSt : new Date().getTime(); // need to check the validity of this statment
};

/**
 * Compass error object
 *
 * @constructor
 * @param code
 */
function CompassError(code) {
    this.code = code || null;
};

CompassError.COMPASS_INTERNAL_ERR = 0;
CompassError.COMPASS_NOT_SUPPORTED = 20;

var compassTimers = {};	// list of timers in use

// Returns default params, overrides if provided with values
function compassOptions(options) {
    var opt = {
        frequency: 100
    };

    if (options) {
        if (options.frequency !== undefined) {
            opt.frequency = options.frequency;
        }
    }
    return opt;
};

/**
 * This class provides access to device compass data.
 * @constructor
 */
function compass() { }


/**
 * Aquires the current compass data
 *
 * @param {Function} successCallback	The function to call when the compass data is available.
 * @param {Function} errorCallback		The function to call when there is an error getting the compass data.
 * @param {CompassOptions} options		The option for getting compass data.
 */
compass.prototype.getCurrentHeading = function (successCallback, errorCallback, options) {

    // options = compassOptions(options);		This is not needed as options are not used.
    var win = function (c) {
        successCallback(new CompassHeading(c.headingMagneticNorth,
        									 c.headingTrueNorth,
			    							(c.headingMagneticNorth - c.headingTrueNorth),
			    							 c.timestamp.getTime()
						)
		)
    };
    var fail = function (e) {
        errorCallback(new CompassError(e));
    };

    var comp = Windows.Devices.Sensors.Compass.getDefault()
    var reading = comp.getCurrentReading();

    if (reading) {
        win(reading);
    } else {
        fail(CompassError.COMPASS_INTERNAL_ERR);
    };
}

/**
 * Watches the compass for changes to the heading. When a change occures, the
 * compassSuccess is called with the new heading
 *
 * @param {Function} successCallback	The function to call each time compass data is available
 * @param {Function} errorCallback		The function to call when there is an error retreiving the heading
 * @param {compassOptions} options	    The options for getting the compass heading (OPTIONAL)
 * @return String						The watch id that must be passed to #clearWatch
 */
compass.prototype.watchHeading = function (successCallback, errorCallback, options) {
    options = compassOptions(options);

    var id = createUUID();
    compassTimers[id] = window.setInterval(function () {
        navigator.compass.getCurrentHeading(successCallback, errorCallback, options);
    }, options.frequency);

    return id;
};

/**
 * Clears the specified heading watch.
 *
 * @param {String} id   The ID of the watch returned from #watchHeading
 */

compass.prototype.clearWatch = function (id) {
    if (id && compassTimers[id] !== undefined) {
        window.clearInterval(compassTimers[id]);
        delete compassTimers[id];
    }
}

if (typeof navigator.compass == "undefined") {
    // Win RT support of the object compas, and is Read-Only. So for test, must change the methods of the object
    //navigator.compass.getCurrentHeading = new compass().getCurrentHeading;
    //navigator.compass.clearWatch = new compass().clearWatch;
    //navigator.compass.watchPosition = new compass().watchHeading; */
    navigator.compass = new compass();

}var device = function () {

    //this.name = ;
    // Windows.Networking.Connectivity.NetworkInformation.GetHostNames()
    this.cordova = "1.7.0";

    // Gets the OS
    this.platform = "Win8";

    // this.uuid = ;			Not possible with current Metro apps

    // this.version = ;			Not possible with current Metro apps
};var Metadata = function (time) {
    this.modificationTime = (typeof time != 'undefined' ? new Date(time) : null);
};

var FileSystemPersistentRoot = (function () {
    //var filePath = Windows.Storage.ApplicationData.current.localFolder.path;
    var filePath = "";

    do {
        Windows.Storage.KnownFolders.documentsLibrary.createFolderAsync("per", Windows.Storage.CreationCollisionOption.openIfExists).done(function (storageFolder) {
            filePath = storageFolder.path;
        });
    } while (filePath = "");

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
/**
 * This class contains position information.
 * @param {Object} lat
 * @param {Object} lng
 * @param {Object} alt
 * @param {Object} acc
 * @param {Object} head
 * @param {Object} vel
 * @param {Object} altacc
 * @constructor
 */
function Coordinates(lat, lng, alt, acc, head, vel, altacc) {
    /**
     * The latitude of the position.
     */
    this.latitude = lat;
    /**
     * The longitude of the position,
     */
    this.longitude = lng;
    /**
     * The accuracy of the position.
     */
    this.accuracy = acc;
    /**
     * The altitude of the position.
     */
    this.altitude = alt;
    /**
     * The direction the device is moving at the position.
     */
    this.heading = head;
    /**
     * The velocity with which the device is moving at the position.
     */
    this.speed = vel;
    /**
     * The altitude accuracy of the position.
     */
    this.altitudeAccuracy = (altacc !== undefined) ? altacc : null;
};

/**
 * Position error object
 *
 * @constructor
 * @param code
 * @param message
 */
function PositionError(code, message) {
    this.code = code || null;
    this.message = message || '';
};

PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

function Position(coords, timestamp) {
    this.coords = new Coordinates(coords.latitude, coords.longitude, coords.altitude, coords.accuracy, coords.heading, coords.speed, coords.altitudeAccuracy);
    this.timestamp = (timestamp !== undefined) ? timestamp : new Date().getTime();
};



var geolocationTimers = {};   // list of timers in use

// Returns default params, overrides if provided with values
function geolocationOptions(options) {
    var opt = {
        maximumAge: 10000,
        enableHighAccuracy: false,
        timeout: 10000
    };

    if (options) {
        if (options.maximumAge !== undefined) {
            opt.maximumAge = options.maximumAge;
        }
        if (options.enableHighAccuracy !== undefined) {
            opt.enableHighAccuracy = options.enableHighAccuracy;
        }
        if (options.timeout !== undefined) {
            opt.timeout = options.timeout;
        }
    }

    return opt;
}


/*
 * This class provides access to device GPS data.
 * @constructor
 */
function geolocation() { }


/**
   * Asynchronously aquires the current position.
   *
   * @param {Function} successCallback    The function to call when the position data is available
   * @param {Function} errorCallback      The function to call when there is an error getting the heading position. (OPTIONAL)
   * @param {PositionOptions} options     The options for getting the position data. (OPTIONAL)
   */
geolocation.prototype.getCurrentPosition = function (successCallback, errorCallback, options) {
    
    options = geolocationOptions(options);
    var win = function (p) {
        successCallback(new Position(
                {
                    latitude: p.latitude,
                    longitude: p.longitude,
                    altitude: p.altitude,
                    accuracy: p.accuracy,
                    heading: p.heading,
                    speed: p.speed,
                    altitudeAccuracy: p.altitudeAccuracy
                },
                p.timestamp || new Date()
            ));
    };
    var fail = function (e) {
        errorCallback(new PositionError(e.code, e.message));
    };
    
    if (options.timeout <= 0 || options.maximumAge <= 1000) {
        var e = new Object();
        e.message = "getCurrentPosition error callback should be called if we set timeout to 0 and maximumAge to a very small number";
        e.code = PositionError.POSITION_UNAVAILABLE;
        fail(e);
    }

    var geolocator = new Windows.Devices.Geolocation.Geolocator();
    if (options.enableHighAccuracy) {
        geolocator.desiredAccuracy = Windows.Devices.Geolocation.PositionAccuracy.high;
    }
    
    geolocator.getGeopositionAsync(options.maximumAge, options.timeout).done(function (geoposition) {
        // Win8 JS API coordinate Object
        var coordinate = geoposition.coordinate;
        win(coordinate);
    }, function () {
        var e = new Object();
        
        switch (geolocator.locationStatus) {
            case Windows.Devices.Geolocation.PositionStatus.ready:
                // Location data is available
                e.message = "Location is available.";
                e.code = PositionError.TIMEOUT;
                fail (e);
                break;
            case Windows.Devices.Geolocation.PositionStatus.initializing:
                // This status indicates that a GPS is still acquiring a fix
                e.message = "A GPS device is still initializing.";
                e.code = PositionError.POSITION_UNAVAILABLE;
                fail(e);
                break;
            case Windows.Devices.Geolocation.PositionStatus.noData:
                // No location data is currently available
                e.message = "Data from location services is currently unavailable.";
                e.code = PositionError.POSITION_UNAVAILABLE;
                fail(e);
                break;
            case Windows.Devices.Geolocation.PositionStatus.disabled:
                // The app doesn't have permission to access location,
                // either because location has been turned off.
                e.message = "Your location is currently turned off. " +
                "Change your settings through the Settings charm " +
                " to turn it back on.";
                e.code = PositionError.PERMISSION_DENIED;
                fail(e);
                break;
            case Windows.Devices.Geolocation.PositionStatus.notInitialized:
                // This status indicates that the app has not yet requested
                // location data by calling GetGeolocationAsync() or
                // registering an event handler for the positionChanged event.
                e.message = "Location status is not initialized because " +
                "the app has not requested location data.";
                e.code = PositionError.POSITION_UNAVAILABLE;
                fail(e);
                break;
            case Windows.Devices.Geolocation.PositionStatus.notAvailable:
                // Location is not available on this version of Windows
                e.message = "You do not have the required location services " +
                "present on your system.";
                e.code = PositionError.POSITION_UNAVAILABLE;
                fail(e);
                break;
            default:
                e.code = PositionError.TIMEOUT;
                fail(e);
                break;

        }
    })
    
}


/**
     * Asynchronously watches the geolocation for changes to geolocation.  When a change occurs,
     * the successCallback is called with the new location.
     *
     * @param {Function} successCallback    The function to call each time the location data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the location data. (OPTIONAL)
     * @param {PositionOptions} options     The options for getting the location data such as frequency. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
geolocation.prototype.watchPosition = function (successCallback, errorCallback, options) {
    options = geolocationOptions(options);

    var id = createUUID();
    geolocationTimers[id] = window.setInterval(function () {
        geolocation.getCurrentPosition(successCallback, errorCallback, options);
    }, options.timeout);

    return id;
}


/**
     * Clears the specified heading watch.
     *
     * @param {String} id       The ID of the watch returned from #watchPosition
     */    
geolocation.prototype.clearWatch = function (id) {
    if (id && geolocationTimers[id] !== undefined) {
        window.clearInterval(geolocationTimers[id]);
        delete geolocationTimers[id];
    }
}

  
if (typeof navigator.geolocation == "undefined") {
    // Win RT support the object geolocation , and is Read-Only , So for test , must to change the methods of Object
    /*navigator.geolocation.getCurrentPosition = new geolocation().getCurrentPosition;
    navigator.geolocation.clearWatch = new geolocation().clearWatch;
    navigator.geolocation.watchPosition = new geolocation().watchPosition;*/
    navigator.geolocation = new geolocation();
}


/*
    Notes
    Windows 8 supports by default mp3, wav, wma, cda, adx, wm, m3u, and wmx. This
    can be expanded on by installing new codecs, but Media.prototype.play() needs
    to updated. 
    ##Todo
    find better method to implement filetype checking to allow for installed codecs
    record audio
    implement more error checking
*/

// Object to represnt a media error
function MediaError(code, message) {
    this.code = code || null;
    this.message = message || null;
}

// Values defined by W3C spec for HTML5 audio
MediaError.MEDIA_ERR_NONE_ACTIVE = 0;
MediaError.MEDIA_ERR_ABORTED = 1;
MediaError.MEDIA_ERR_NETWORK = 2;
MediaError.MEDIA_ERR_DECODE = 3;
MediaError.MEDIA_ERR_NONE_SUPPORTED = 4;

function Media(src, mediaSuccess, mediaError, mediaStatus) {
    this.id = createUUID();

    this.src = src;

    this.mediaSuccess = mediaSuccess || null;

    this.mediaError = mediaError || null;

    this.mediaStatus = mediaStatus || null;

    this._position = 0;

    this._duration = -1;

    // Private variable used to identify the audio
    this.node = null;
    this.mediaCaptureMgr = null;

};

// Returns the current position within an audio file
Media.prototype.getCurrentPosition = function (success, failure) {
    this._position = this.node.currentTime;
    success(this._position);
};

// Returns the duration of an audio file
Media.prototype.getDuration = function () {
    this._duration = this.node.duration;
    return this._duration;
};

// Starts or resumes playing an audio file.
Media.prototype.play = function () {
    this.node = new Audio(this.src);
    var filename = this.src.split('.').pop(); // get the file extension

    if (filename === 'mp3' ||
        filename === 'wav' ||
        filename === 'wma' ||
        filename === 'cda' ||
        filename === 'adx' ||
        filename === 'wm' ||
        filename === 'm3u' ||
        filename === 'wmx') {  // checks to see if file extension is correct
        if (this.node === null) {
            this.node.load();
            this._duration = this.node.duration;
        };
        this.node.play();
    } else {
        //invalid file name
        this.mediaError(new MediaError(MediaError.MEDIA_ERR_ABORTED, "Invalid file name"));
    };
};

// Pauses playing an audio file.
Media.prototype.pause = function () {
    if (this.node) {
        this.node.pause();
    }
};

// Releases the underlying operating systems audio resources.
Media.prototype.release = function () {
    delete node;
};

// Sets the current position within an audio file.
Media.prototype.seekTo = function (milliseconds) {
    if (this.node) {
        this.node.currentTime = milliseconds / 1000;
        this.getCurrentPosition();
    }
};

// Starts recording an audio file.
Media.prototype.startRecord = function () {
    // Initialize device
    var captureInitSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
    captureInitSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.audio;
    this.mediaCaptureMgr = new Windows.Media.Capture.MediaCapture();
    this.mediaCaptureMgr.addEventListener("failed", mediaError);

    this.mediaCaptureMgr.initializeAsync(captureInitSettings).done(function (result) {
        this.mediaCaptureMgr.addEventListener("recordlimitationexceeded", mediaError);
        this.mediaCaptureMgr.addEventListener("failed", mediaError);
    }, mediaError);
    // Start recording
    Windows.Storage.KnownFolders.musicLibrary.createFileAsync(src, Windows.Storage.CreationCollisionOption.replaceExisting).done(function (newFile) {
        var storageFile = newFile;
        var fileType = this.src.split('.').pop();
        var encodingProfile = null;
        switch (fileType) {
            case 'm4a':
                encodingProfile = Windows.Media.MediaProperties.MediaEncodingProfile.createM4a(Windows.Media.MediaProperties.AudioEncodingQuality.auto);
                break;
            case 'mp3':
                encodingProfile = Windows.Media.MediaProperties.MediaEncodingProfile.createMp3(Windows.Media.MediaProperties.AudioEncodingQuality.auto);
                break;
            case 'wma':
                encodingProfile = Windows.Media.MediaProperties.MediaEncodingProfile.createWma(Windows.Media.MediaProperties.AudioEncodingQuality.auto);
                break;
            default:
                mediaError();
                break;
        };
        this.mediaCaptureMgr.startRecordToStorageFileAsync(encodingProfile, storageFile).done(function (result) { }, mediaError);
    }, mediaError);
};

// Stops recording an audio file.
Media.prototype.stopRecord = function () {
    this.mediaCaptureMgr.stopRecordAsync().done(mediaSuccess, mediaError);

};

// Stops playing an audio file.
Media.prototype.stop = function () {
    if (this._position > 0) {
        this.node.pause();
        this.node.currentTime = 0;
        this._position = this.node.currentTime;
    }
};function Connection() {
    // Accesses Windows.Networking get the internetConnection Profile.
    this.type = function () {
        var ret;
        var profile = Windows.Networking.Connectivity.NetworkingInformation.getInternetConnectionProfile();
        if (profile) {
			// IANA Interface type represents the type of connection to the computer.
			// Values can be found at http://www.iana.org/assignments/ianaiftype-mib/ianaiftype-mib
			// Code should be updated to represent more values from the above link
            ret = profile.networkAdapter.ianaInterfaceType;
            switch (ret) {
                case 6:		// 6 represents wired ethernet
                    ret = Connection.ETHERNET;
                    break;
                case 71:	// 71 represents 802.11 wireless connection
                    ret = Connection.WIFI;
                    break;
                default:	// Other values may exist
                    ret = Connection.UNKNOWN;
                    break;
            };
        } else {
			// If no profile is generated, no connection exists
            ret = Connection.NONE;
        };
        return ret;
    };
};
function Network() {
        this.connection = new Connection();

};

Connection.UNKNOWN = "unknown";
Connection.ETHERNET = "ethernet";
Connection.WIFI = "wifi";
Connection.CELL_2G = "2g";
Connection.CELL_3G = "3g";
Connection.CELL_4G = "4g";
Connection.NONE = "none";

if (typeof navigator.network == "undefined") {
    // Win RT support the object network , and is Read-Only , So for test , must to change the methods of Object
    navigator.network = new Network();
};/**
 * This class provides access to the notification code.
 */
function Notification() { };

Notification.prototype.alert = function (message, alertCallback, title, buttonName) {
    title = title || "Alert";
    buttonName = buttonName || "OK";

    var md = new Windows.UI.Popups.MessageDialog(message, title);
    md.commands.append(new Windows.UI.Popups.UICommand(buttonName));
    md.showAsync().then(alertCallback);
};
Notification.prototype.confirm = function (message, confirmCallback, title, buttonLabels) {
    title = title || "Confirm";
    buttonLabels = buttonLabels || "OK,Cancel";

    var md = new Windows.UI.Popups.MessageDialog(message, title);
    var button = buttonLabels.split(',');
    md.commands.append(new Windows.UI.Popups.UICommand(button[0]));
    md.commands.append(new Windows.UI.Popups.UICommand(button[1]));
    md.showAsync().then(confirmCallback);
};

if (typeof navigator.notification == "undefined") {
    navigator.notification = new Notification;
}var storageParam = {
    db : null,
    dbName : null,
    path : Windows.Storage.ApplicationData.current.localFolder.path
}


/**
     * Create a UUID
     */
function createUUID() {
    function UUIDcreatePart(length) {
        var uuidpart = "";
        for (var i = 0; i < length; i++) {
            var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
            if (uuidchar.length == 1) {
                uuidchar = "0" + uuidchar;
            }
            uuidpart += uuidchar;
        }
        return uuidpart;
    }
    return UUIDcreatePart(4) + '-' +
            UUIDcreatePart(2) + '-' +
            UUIDcreatePart(2) + '-' +
            UUIDcreatePart(2) + '-' +
            UUIDcreatePart(6);
}

function SQLError(error) {
    this.code = error || null;
}

SQLError.UNKNOWN_ERR = 0;
SQLError.DATABASE_ERR = 1;
SQLError.VERSION_ERR = 2;
SQLError.TOO_LARGE_ERR = 3;
SQLError.QUOTA_ERR = 4;
SQLError.SYNTAX_ERR = 5;
SQLError.CONSTRAINT_ERR = 6;
SQLError.TIMEOUT_ERR = 7;



/**
 * Open database
 *
 * @param name              Database name
 * @param version           Database version
 * @param display_name      Database display name
 * @param size              Database size in bytes
 * @return                  Database object
 */
function openDatabase(name, version, display_name, size) {
    if (storageParam.db != null) { storageParam.db.close(); }
    if (String(name).match(new RegExp(/\?|\\|\*|\||\"|<|>|\:|\//g))) {
        return null;
        //throw new Error("invalid name error");
    };
    storageParam.dbName = storageParam.path + "\\" + name + ".sqlite";
    storageParam.db = new SQLite3.Database(storageParam.dbName);
    return new Database();
}


function Database() { }

/**
 * Start a transaction.
 * Does not support rollback in event of failure.
 *
 * @param process {Function}            The transaction function
 * @param successCallback {Function}
 * @param errorCallback {Function}
 */
Database.prototype.transaction = function (process, errorCallback, successCallback) {
    var tx = new SQLTransaction();
    tx.successCallback = successCallback;
    tx.errorCallback = errorCallback;
    try {
        process(tx);
    } catch (e) {
        
        if (tx.errorCallback) {
            try {
                tx.errorCallback(new SQLError(SQLError.SYNTAX_ERR));
            } catch (ex) {
                console.log("Transaction error calling user error callback: " + e);
            }
        }
    }
}



function queryQueue() { };


/**
 * Transaction object
 * PRIVATE METHOD
 * @constructor
 */
function SQLTransaction () {
    
    // Set the id of the transaction
    this.id = createUUID();

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

    // Query list
    this.queryList = {};
};

/**
 * Mark query in transaction as complete.
 * If all queries are complete, call the user's transaction success callback.
 *
 * @param id                Query id
 */
SQLTransaction.prototype.queryComplete = function (id) {
    delete this.queryList[id];

    // If no more outstanding queries, then fire transaction success
    if (this.successCallback) {
        var count = 0;
        var i;
        for (i in this.queryList) {
            if (this.queryList.hasOwnProperty(i)) {
                count++;
            }
        }
        if (count === 0) {
            try {
                this.successCallback();
            } catch (e) {
                if (typeof this.errorCallback === "function") {
                    this.errorCallback(new SQLError(SQLError.UNKNOWN_ERR));
                }
            }
        }
    }
};

/**
 * Mark query in transaction as failed.
 *
 * @param id                Query id
 * @param reason            Error message
 */
SQLTransaction.prototype.queryFailed = function (id, reason) {

    // The sql queries in this transaction have already been run, since
    // we really don't have a real transaction implemented in native code.
    // However, the user callbacks for the remaining sql queries in transaction
    // will not be called.
    this.queryList = {};

    if (this.errorCallback) {
        try {
            this.errorCallback(reason);
        } catch (e) {
            console.log("Transaction error calling user error callback: " + e);
        }
    }
};

/**
 * Execute SQL statement
 *
 * @param sql                   SQL statement to execute
 * @param params                Statement parameters
 * @param successCallback       Success callback
 * @param errorCallback         Error callback
 */
SQLTransaction.prototype.executeSql = function (sql, params, successCallback, errorCallback) {

    var isDDL = function (query) {
        var cmdHeader = String(query).toLowerCase().split(" ")[0];
        if (cmdHeader == "drop" || cmdHeader == "create" || cmdHeader == "alter" || cmdHeader == "truncate") {
            return true;
        }
        return false;
    };

    // Init params array
    if (typeof params === 'undefined' || params == null) {
        params = [];
    }

    // Create query and add to queue
    var query = new DB_Query(this);
    queryQueue[query.id] = query;

    // Save callbacks
    query.successCallback = successCallback;
    query.errorCallback = errorCallback;

    // Call native code
    
    var statement = null;
    var type = function (obj) {
        var typeString;
        typeString = Object.prototype.toString.call(obj);
        return typeString.substring(8, typeString.length - 1).toLowerCase();
    }

    try {
        if (isDDL(sql)) {
            
            statement = storageParam.db.prepare(sql);
            statement.step();
            if (resultCode === SQLite3.ResultCode.error) {
                if (typeof query.errorCallback === 'function') {
                    query.errorCallback(new SQLError(SQLError.SYNTAX_ERR));
                }
                return;
            }
            statement.close();
            completeQuery(query.id, "");
        } else {
            statement = storageParam.db.prepare(sql);
            var index, resultCode;
            params.forEach(function (arg, i) {
                index = i + 1;
                
                switch (type(arg)) {
                    case 'number':
                        if (arg % 1 === 0) {
                            resultCode = statement.bindInt(index, arg);
                        } else {
                            resultCode = statement.bindDouble(index, arg);
                        }
                        break;
                    case 'string':
                        resultCode = statement.bindText(index, arg);
                        break;
                    case 'null':
                        resultCode = statement.bindNull(index);
                        break;
                    default:
                        if (typeof query.errorCallback === 'function') {
                            query.errorCallback(new SQLError(SQLError.DATABASE_ERR));
                        }
                        return;
                }
                if (resultCode !== SQLite3.ResultCode.ok) {
                    if (typeof query.errorCallback === 'function') {
                        query.errorCallback(new SQLError(SQLError.DATABASE_ERR));
                    }
                    return;
                }
            });
            // get data
            var result = new Array();
            // get the Result codes of SQLite3
            resultCode = statement.step();
            if (resultCode === SQLite3.ResultCode.row) {
                do{
                    var row = new Object();
                    for (var j = 0 ; j < statement.columnCount() ; j++) {
                        // set corresponding type
                        if (statement.columnType(j) == "1") {
                            row[statement.columnName(j)] = statement.columnInt(j);
                        } else if (statement.columnType(j) == "2") {
                            row[statement.columnName(j)] = statement.columnDouble(j);
                        } else if (statement.columnType(j) == "3") {
                            row[statement.columnName(j)] = statement.columnText(j);
                        } else if (statement.columnType(j) == "5") {
                            row[statement.columnName(j)] = null;
                        } else {
                            if (typeof query.errorCallback === 'function') {
                                query.errorCallback(new SQLError(SQLError.DATABASE_ERR));
                            }
                            return;
                        }
                    
                    }
                    result.push(row);
                } while (statement.step() === SQLite3.ResultCode.row);
                // SQL error or missing database
            } else if (resultCode === SQLite3.ResultCode.error) {
                if (typeof query.errorCallback === 'function') {
                    query.errorCallback(new SQLError(SQLError.SYNTAX_ERR));
                }
                return;
            }
            completeQuery(query.id, result);
            statement.close();
        }
        
    } catch (e) {
        failQuery(e.description, query.id)
    }
};

/**
 * Callback from native code when query is complete.
 * PRIVATE METHOD
 *
 * @param id   Query id
 */
function completeQuery(id, data) {
    var query = queryQueue[id];
    if (query) {
        try {
            delete queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {

                // Save query results
                var r = new SQLResultSet();
                r.rows.resultSet = data;
                r.rows.length = data.length;
                try {
                    if (typeof query.successCallback === 'function') {
                        query.successCallback(query.tx, r);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user success callback: " + ex);
                }

                tx.queryComplete(id);
            }
        } catch (e) {
            if (typeof query.errorCallback === 'function') {
                query.errorCallback(new SQLError(SQLError.UNKNOWN_ERR));
            } else {
                console.log("executeSql error: " + e);
            }
       } 
    }
}

/**
 * Callback from native code when query fails
 * PRIVATE METHOD
 *
 * @param reason            Error message
 * @param id                Query id
 */
function failQuery(reason, id) {
    var query = queryQueue[id];
    if (query) {
        try {
            delete queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            
            if (tx && tx.queryList[id]) {
                tx.queryList = {};

                try {
                    if (typeof query.errorCallback === 'function') {
                        
                        query.errorCallback(new SQLError(SQLError.SYNTAX_ERR));
                        return;
                    }
                } catch (ex) {
                    console.log("executeSql error calling user error callback: " + ex);
                }

                tx.queryFailed(id, reason);
            }

        } catch (e) {
            if (typeof query.errorCallback === 'function') {
                query.errorCallback(new SQLError(SQLError.UNKNOWN_ERR));
            } else {
                console.log("executeSql error: " + e);
            }
        } 
    }
}

/**
 * SQL query object
 * PRIVATE METHOD
 *
 * @constructor
 * @param tx                The transaction object that this query belongs to
 */
function DB_Query(tx) {

    // Set the id of the query
    this.id = createUUID();

    // Add this query to the queue
    queryQueue[this.id] = this;

    // Init result
    this.resultSet = [];

    // Set transaction that this query belongs to
    this.tx = tx;

    // Add this query to transaction list
    this.tx.queryList[this.id] = this;

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

};

/**
 * SQL result set object
 * PRIVATE METHOD
 * @constructor
 */
function SQLResultSetList () {
    this.resultSet = [];    // results array
    this.length = 0;        // number of rows
};

/**
 * Get item from SQL result set
 *
 * @param row           The row number to return
 * @return              The row object
 */
SQLResultSetList.prototype.item = function (row) {
    return this.resultSet[row];
};

/**
 * SQL result set that is returned to user.
 * PRIVATE METHOD
 * @constructor
 */
function SQLResultSet () {
    this.rows = new SQLResultSetList();
};