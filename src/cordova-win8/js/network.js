function Connection() {
    this.type = function () {
        var ret;
        var profile = Windows.Networking.Connectivity.NetworkingInformation.getInternetConnectionProfile();
        if (profile) {
            ret = profile.networkAdapter.ianaInterfaceType;
            switch (ret) {
                case 6:
                    ret = Connection.ETHERNET;
                    break;
                case 71:
                    ret = Connection.WIFI;
                    break;
                default:
                    ret = Connection.UNKNOWN;
                    break;
            };
        } else {
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