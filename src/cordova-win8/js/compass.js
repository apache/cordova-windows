/**
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
function Compass() { }


/**
 * Aquires the current compass data
 *
 * @param {Function} successCallback	The function to call when the compass data is available.
 * @param {Function} errorCallback		The function to call when there is an error getting the compass data.
 * @param {CompassOptions} options		The option for getting compass data.
 */
Compass.prototype.getCurrentHeading = function (successCallback, errorCallback, options) {

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
Compass.prototype.watchHeading = function (successCallback, errorCallback, options) {
	var thisComp = this;
    options = compassOptions(options);

    var id = createUUID();
    compassTimers[id] = window.setInterval(function () {
        thisComp.getCurrentHeading(successCallback, errorCallback, options);
    }, options.frequency);

    return id;
};

/**
 * Clears the specified heading watch.
 *
 * @param {String} id   The ID of the watch returned from #watchHeading
 */

Compass.prototype.clearWatch = function (id) {
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
    navigator.compass = new Compass();

}