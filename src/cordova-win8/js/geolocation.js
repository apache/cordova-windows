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


