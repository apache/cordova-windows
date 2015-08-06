/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/

var path    = require('path'),
    et      = require('elementtree'),
    Q       = require('q'),
    cp      = require('child_process'),
    shelljs = require('shelljs'),
    ROOT    = path.join(__dirname, '..', '..');

var appTracingLogInitialState = null,
    adminLogInitialState = null;

/*
 * Gets windows AppHost/ApplicationTracing and AppHost/Admin logs
 * and prints them to console
 */
module.exports.run = function() {
    getLogState('Microsoft-Windows-AppHost/ApplicationTracing').then(function (state) {
        appTracingLogInitialState = state;
        return getLogState('Microsoft-Windows-AppHost/Admin');
    }).then(function(state) {
        adminLogInitialState = state;
        return enableLogging('Microsoft-Windows-AppHost/Admin');
    }).then(function () {
        return enableLogging('Microsoft-Windows-AppHost/ApplicationTracing');
    }).then(function () {
        console.log('Now printing logs. To stop, please press Ctrl+C once.');
        startLogging('Microsoft-Windows-AppHost/Admin');
        startLogging('Microsoft-Windows-AppHost/ApplicationTracing');
    }).catch(function (error) {
        console.error(error);
    });

    // Disable logs before exiting
    process.on('exit', function () {
        if ((appTracingLogInitialState !== null) && !appTracingLogInitialState) {
            disableLogging('Microsoft-Windows-AppHost/ApplicationTracing');
        }
        if ((adminLogInitialState !== null) && !adminLogInitialState) {
            disableLogging('Microsoft-Windows-AppHost/Admin');
        }
    });

    // Catch Ctrl+C event and exit gracefully
    process.on('SIGINT', function () {
        process.exit(2);
    });

    // Catch uncaught exceptions, print trace, then exit gracefully
    process.on('uncaughtException', function(e) {
        console.log(e.stack);
        process.exit(99);
    });
};

function startLogging(channel) {
    var startTime = new Date().toISOString();
    setInterval(function() {
        var command = 'wevtutil qe ' + channel + ' /q:"*[System [(TimeCreated [@SystemTime>\'' + startTime + '\'])]]" /e:root';
        cp.exec(command, function (error, stdout, stderr) {
            if (error) {
                throw new Error('Failed to run wevtutil command. ' + error);
            } else {
                parseEvents(stdout).forEach(function (evt) {
                    startTime = evt.timeCreated;
                    console.log(stringifyEvent(evt));
                });
            }
        });
    }, 1000);
}

module.exports.help = function() {
    console.log('Usage: ' + path.relative(process.cwd(), path.join(ROOT, 'cordova', 'log')));
    console.log('Continuously prints the windows logs output to the command line.');
    process.exit(0);
};

function getElementValue(et, element, attribute) {
    var result;

    var found = et.findall(element);
    if (found.length > 0) {
        if (!!attribute) {
            result = found[0].get(attribute);
        } else {
            result = found[0].text; 
        }
    }

    return result;
}

function parseEvents(output) {
    var etree = et.parse(output);
    var events = etree.getroot().findall('./Event');
    var results = [];

    events.forEach(function (event) {
        // Get only unhandled exceptions from Admin log
        if (getElementValue(event, './System/Channel') === 'Microsoft-Windows-AppHost/Admin' &&
            typeof getElementValue(event, './UserData/WWAUnhandledApplicationException') === 'undefined') {
            return;
        }

        var result = {
            channel: getElementValue(event, './System/Channel'),
            timeCreated: getElementValue(event, './System/TimeCreated', 'SystemTime'),
            pid: getElementValue(event, './System/Execution', 'ProcessID'),
            proc: getElementValue(event, './UserData/WWADevToolBarLog/DisplayName'),
            source: getElementValue(event, './UserData/WWADevToolBarLog/Source'),
            documentFile: getElementValue(event, './UserData/WWADevToolBarLog/DocumentFile') ||
                          getElementValue(event, './UserData/WWAUnhandledApplicationException/DocumentFile'),
            line: getElementValue(event, './UserData/WWADevToolBarLog/Line'),
            column: getElementValue(event, './UserData/WWADevToolBarLog/Column'),
            sourceFile: getElementValue(event, './UserData/WWAUnhandledApplicationException/SourceFile'),
            sourceLine: getElementValue(event, './UserData/WWAUnhandledApplicationException/SourceLine'),
            sourceColumn: getElementValue(event, './UserData/WWAUnhandledApplicationException/SourceColumn'),
            message: getElementValue(event, './UserData/WWADevToolBarLog/Message'),
            displayName: getElementValue(event, './UserData/WWAUnhandledApplicationException/DisplayName'),
            appName: getElementValue(event, './UserData/WWAUnhandledApplicationException/ApplicationName'),
            errorType: getElementValue(event, './UserData/WWAUnhandledApplicationException/ErrorType'),
            errorDescription: getElementValue(event, './UserData/WWAUnhandledApplicationException/ErrorDescription'),
            stackTrace: getElementValue(event, './UserData/WWAUnhandledApplicationException/StackTrace'),
        };
 
        results.push(result);
    });
    
    return results;
}

function formatField(event, fieldName, fieldShownName, offset) {
    var whitespace = '', // to align all field values
        multiLineWhitespace = ' '; // to align multiline fields (i.e. Stack Trace) correctly
    for (var i = 0; i < offset; i++) {
        if (i >= fieldShownName.length) {
            whitespace += ' ';
        }
        multiLineWhitespace += ' ';
    }

    if (event.hasOwnProperty(fieldName) && (typeof event[fieldName] !== 'undefined')) {
        event[fieldName] = event[fieldName].replace(/\n\s*/g, '\n' + multiLineWhitespace);
        return ('\n' + fieldShownName + ':' + whitespace + event[fieldName]).replace(/\n$/m, '');
    }
    return '';
}

function stringifyEvent(event) {
    if (typeof event === 'undefined') {
        return;
    }

    var result = '',
        offset = 18;

    result += formatField(event, 'channel', 'Channel', offset);
    result += formatField(event, 'timeCreated', 'Time Created', offset);
    result += formatField(event, 'pid', 'Process ID', offset);
    result += formatField(event, 'proc', 'Process', offset);
    result += formatField(event, 'source', 'Source', offset);
    result += formatField(event, 'documentFile', 'Document File', offset);
    result += formatField(event, 'line', 'Line', offset);
    result += formatField(event, 'column', 'Column', offset);
    result += formatField(event, 'message', 'Message', offset);
    result += formatField(event, 'displayName', 'Display Name', offset);
    result += formatField(event, 'appName', 'App Name', offset);
    result += formatField(event, 'errorType', 'Error Type', offset);
    result += formatField(event, 'errorDescription', 'Error Description', offset);
    result += formatField(event, 'sourceFile', 'Source File', offset);
    result += formatField(event, 'sourceLine', 'Source Line', offset);
    result += formatField(event, 'sourceColumn', 'Source Column', offset);
    result += formatField(event, 'stackTrace', 'Stack Trace', offset);

    return result;
}

function getLogState(channel) {
    return exec('wevtutil get-log "' + channel + '"').then(function(output) {
        return output.indexOf('enabled: true') != -1;
    });
}

function enableLogging(channel) {
    return exec('wevtutil set-log "' + channel + '" /e:false /q:true').then(function() {
        return exec('wevtutil set-log "' + channel + '" /e:true /rt:true /ms:4194304 /q:true');
    }, function() {
        console.warn('Cannot enable log channel: ' + channel);
        console.warn('Try running the script with administrator privileges.');
    });
}

function disableLogging(channel) {
    console.log('Disabling channel ' + channel);
    // using shelljs here to execute the command syncronously 
    // async exec doesn't seem to do the trick when the process is exiting
    shelljs.exec('wevtutil set-log "' + channel + '" /e:false /q:true');
}

function exec(command) {
    var d = Q.defer();
    cp.exec(command, function (error, stdout) {
        if (error) {
            d.reject('An error occured while executing following command:\n' + command + '\n' + error);
        }
        d.resolve(stdout);
    });
    return d.promise;
}
