function alert(message) {
    navigator.notification.alert(message, function () { });
};

function id(elementId) {
    return document.getElementById(elementId);
}

function getGeoQuick() {
    // onSuccess Callback
    //   This method accepts a `Position` object, which contains
    //   the current GPS coordinates
    //
    var onSuccess = function (position) {
        id('geoLatQuick').innerText = position.coords.latitude;
        id('geoLongQuick').innerText = position.coords.longitude;
        id('geoAccQuick').innerText = position.coords.accuracy;
        id('geoAltQuick').innerText = position.coords.altitude;
        id('geoAltAccQuick').innerText = position.coords.altitudeAccuracy;
        id('geoHeadQuick').innerText = position.coords.heading;
        id('geoVelQuick').innerText = position.coords.speed;
        id('geoTimeQuick').innerText = new Date(position.timestamp);
    };

    // onError Callback receives a PositionError object
    //
    function onError(error) {
        alert('code: ' + error.code + '\n' +
              'message: ' + error.message + '\n');
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError);
};

function getAccelQuick() {
    function onSuccess(acceleration) {
        id('accXQuick').innerText = acceleration.x;
        id('accYQuick').innerText = acceleration.y;
        id('accZQuick').innerText = acceleration.z;
        id('accTimeQuick').innerText = acceleration.timestamp;
    };

    function onError() {
        alert('onError!');
    };

    navigator.accelerometer.getCurrentAcceleration(onSuccess, onError);

};

function getCompQuick() {
    function onSuccess(heading) {
        id('compHeadQuick').innerText = heading.magneticHeading;
        id('compTimeQuick').innerText = new Date(heading.timestamp);
    };

    function onError(error) {
        alert('CompassError: ' + error.code);
    };

    navigator.compass.getCurrentHeading(onSuccess, onError);

};


var geoPersist = false;
var accelPersist = false;
var compPersist = false;
var geoWatchID;
var accWatchID;
var compWatchID;

function hitGeoPersist() {
    if (geoPersist) {
        geoPersist = false;
        id('btnGeoPersist').innerHTML = 'Watch Gelocation';

        navigator.geolocation.clearWatch(geoWatchID);
    } else {
        geoPersist = true;
        id('btnGeoPersist').innerHTML = 'Stop Gelocation';

        var onSuccess = function (position) {
            id('geoLatPersist').innerText = position.coords.latitude;
            id('geoLongPersist').innerText = position.coords.longitude;
            id('geoAccPersist').innerText = position.coords.accuracy;
            id('geoAltPersist').innerText = position.coords.altitude;
            id('geoAltAccPersist').innerText = position.coords.altitudeAccuracy;
            id('geoHeadPersist').innerText = position.coords.heading;
            id('geoVelPersist').innerText = position.coords.speed;
            id('geoTimePersist').innerText = new Date(position.timestamp);
        };

        function onError(error) {
            alert('code: ' + error.code + '\n' +
                  'message: ' + error.message + '\n');
        }

        geoWatchID = navigator.geolocation.watchPosition(onSuccess, onError, {frequency: 2000});
    }
};

function hitAccelPersist() {
    if (accelPersist) {
        accelPersist = false;
        id('btnAccPersist').innerHTML = 'Watch Acceleration';
        
        navigator.accelerometer.clearWatch(accWatchID);
    } else {
        accelPersist = true;
        id('btnAccPersist').innerHTML = 'Stop Acceleration';
        
        function onSuccess(acceleration) {
            id('accXPersist').innerText = acceleration.x;
            id('accYPersist').innerText = acceleration.y;
            id('accZPersist').innerText = acceleration.z;
            id('accTimePersist').innerText = acceleration.timestamp;
        };

        function onError() {
            alert('onError!');
        };

        navigator.accelerometer.getCurrentAcceleration(onSuccess, onError);

        accWatchID = navigator.accelerometer.watchAcceleration(onSuccess, onError, { frequency: 100 });
    }

};

function hitCompPersist() {
    if (compPersist) {
        compPersist = false;
        id('btnCompPersist').innerHTML = 'Watch Compass';

        navigator.compass.clearWatch(compWatchID);
    } else {
        compPersist = true;
        id('btnCompPersist').innerHTML = 'Stop Compass';
        
        function onSuccess(heading) {
            id('compHeadPersist').innerText = heading.magneticHeading;
            id('compTimePersist').innerText = new Date(heading.timestamp);
        };

        function onError(error) {
            alert('CompassError: ' + error.code);
        };

        navigator.compass.getCurrentHeading(onSuccess, onError);

        compWatchID = navigator.compass.watchHeading(onSuccess, onError, { frequency: 100 });
    }
};