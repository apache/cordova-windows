describe('Geolocation (navigator.geolocation)', function () {
    it("should exist", function() {
        expect(navigator.geolocation).toBeDefined();
    });

    it("should contain a getCurrentPosition function", function() {
        expect(typeof navigator.geolocation.getCurrentPosition).toBeDefined();
        expect(typeof navigator.geolocation.getCurrentPosition == 'function').toBe(true);
    });

    it("should contain a watchPosition function", function() {
        expect(typeof navigator.geolocation.watchPosition).toBeDefined();
        expect(typeof navigator.geolocation.watchPosition == 'function').toBe(true);
    });

    it("should contain a clearWatch function", function() {
        expect(typeof navigator.geolocation.clearWatch).toBeDefined();
        expect(typeof navigator.geolocation.clearWatch == 'function').toBe(true);
    });

    describe('getCurrentPosition method', function() {
        describe('error callback', function() {
            it("should be called if we set timeout to 0 and maximumAge to a very small number", function() {
                console.log("Here I am");
                var win = jasmine.createSpy(),
                    fail = jasmine.createSpy();

                runs(function () {
                    navigator.geolocation.getCurrentPosition(win, fail, {
                        maximumAge: 0,
                        timeout: 0
                    });
                });

                waitsFor(function () { return fail.wasCalled; }, "fail never called", 250); //small timeout as this should fire very fast

                runs(function () {
                    expect(win).not.toHaveBeenCalled();
                });
            });
        });

        describe('success callback', function() {
            it("should be called with a Position object", function() {
                var win = jasmine.createSpy().andCallFake(function(p) {
                          expect(p.coords).toBeDefined();
                          expect(p.timestamp).toBeDefined();
                          expect(p.timestamp instanceof Date).toBe(true);
                      }),
                      fail = jasmine.createSpy();

                runs(function () {
                    navigator.geolocation.getCurrentPosition(win, fail, {
                        maximumAge:300000 // 5 minutes maximum age of cached position
                    });
                });

                waitsFor(function () { return win.wasCalled; }, "win never called", 20000);

                runs(function () {
                    expect(fail).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe('watchPosition method', function() {
        describe('error callback', function() {
            var errorWatch = null;

            afterEach(function() {
                navigator.geolocation.clearWatch(errorWatch);
            });
            it("should be called if we set timeout to 0 and maximumAge to a very small number", function() {
                var win = jasmine.createSpy(),
                    fail = jasmine.createSpy();

                runs(function () {
                    errorWatch = navigator.geolocation.watchPosition(win, fail, {
                        maximumAge: 0,
                        timeout: 0
                    });
                });

                waitsFor(function () { return fail.wasCalled; }, "fail never called", 250); // small timeout as this hsould fire very quickly

                runs(function () {
                    expect(win).not.toHaveBeenCalled();
                });
            });
        });

        describe('success callback', function() {
            var successWatch = null;

            afterEach(function() {
                navigator.geolocation.clearWatch(successWatch);
            });
            it("should be called with a Position object", function() {
                var win = jasmine.createSpy().andCallFake(function(p) {
                          expect(p.coords).toBeDefined();
                          expect(p.timestamp).toBeDefined();
                          expect(p.timestamp instanceof Date).toBe(true);
                      }),
                      fail = jasmine.createSpy();

                runs(function () {
                    successWatch = navigator.geolocation.watchPosition(win, fail, {
                        maximumAge:300000 // 5 minutes maximum age of cached position
                    });
                });

                waitsFor(function () { return win.wasCalled; }, "win never called", 20000);

                runs(function () {
                    expect(fail).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe("Geolocation model", function () {
        it("should be able to define a Position object with coords and timestamp properties", function() {
            var pos = new Position({}, new Date());
            expect(pos).toBeDefined();
            expect(pos.coords).toBeDefined();
            expect(pos.timestamp).toBeDefined();
        });

        it("should be able to define a Coordinates object with latitude, longitude, accuracy, altitude, heading, speed and altitudeAccuracy properties", function() {
            var coords = new Coordinates(1,2,3,4,5,6,7);
            expect(coords).toBeDefined();
            expect(coords.latitude).toBeDefined();
            expect(coords.longitude).toBeDefined();
            expect(coords.accuracy).toBeDefined();
            expect(coords.altitude).toBeDefined();
            expect(coords.heading).toBeDefined();
            expect(coords.speed).toBeDefined();
            expect(coords.altitudeAccuracy).toBeDefined();
        });
    });
});
