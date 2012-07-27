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
}


/*
 * This class provides access to device acceleration data.
 * @constructor
 */
function accelerometer() { }


/**
 * Aquires the current 3d acceleration.
 *
 * @param {Function} accelerometerSuccess	The Function to call when the acceleration data is available
 * @param {Function} accelerometerError		The function to call when there is an error getting the acceleration data
 */
accelerometer.prototype.getCurrentAcceleration = function (accelerometerSuccess, accelerometerError) {
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

accelerometer.prototype.watchAcceleration = function (accelerometerSuccess, accelerometerError, options) {
    options = accelerometerOptions(options);

    var id = createUUID();
    accelerometerTimers[id] = window.setInterval(function () {
        accelerometer.getCurrentAcceleration(accelerometerSuccess, accelerometerError);
    }, options.frequency);

    return id;
};

/**
 * Stop watching the acceleration referenced by the watchId param.
 *
 * @param {String} id		The ID of the watch returned from #watchAcceleration
 */

accelerometer.prototype.clearWatch = function (watchId) {
    if (watchId && accelerationTimers[watchId] !== undefined) {
        window.clearInterval(accelerationTimers[watchId]);
        delete accelerationTimers[id];
    }
};

if (typeof navigator.accelerometer == "undefined") {
    // Win RT support the object accelerometer , and is Read-Only , So for test , must to change the methods of Object
    // navigator.accelerometer.getCurrentAcceleration = new accelerometer().getCurrentAcceleration;
    // navigator.accelerometer.clearWatch = new accelerometer().clearWatch;
    // navigator.accelerometer.watchAcceleration = new accelerometer().watchAcceleration;
    navigator.accelerometer = new accelerometer();
}
