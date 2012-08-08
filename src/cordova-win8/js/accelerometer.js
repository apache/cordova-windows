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
        Accelerometer.getCurrentAcceleration(accelerometerSuccess, accelerometerError);
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
    navigator.accelerometer = new Accelerometer();
    navigator.accelerometer.getCurrentAcceleration = new Accelerometer().getCurrentAcceleration;
    navigator.accelerometer.clearWatch = new Accelerometer().clearWatch;
    navigator.accelerometer.watchAcceleration = new Accelerometer().watchAcceleration;
}
