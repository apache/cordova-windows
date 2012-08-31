var storageParam = {
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

////
/**
 * Event fired to signify code is fully loaded
 */

fireEvent("deviceready", document, "HTMLEvents");