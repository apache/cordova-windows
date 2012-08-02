function Connection() {
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
};