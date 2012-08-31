 /**
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
}