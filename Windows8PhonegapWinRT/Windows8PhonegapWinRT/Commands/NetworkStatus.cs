/*  
	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	
	http://www.apache.org/licenses/LICENSE-2.0
	
	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/


using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Windows8PhonegapWinRT.Commands
{
    public class NetworkStatus : BaseCommand
    {
        const string UNKNOWN = "unknown";
        const string ETHERNET = "ethernet";
        const string WIFI = "wifi";
        const string CELL_2G = "2g";
        const string CELL_3G = "3g";
        const string CELL_4G = "4g";
        const string NONE = "none";
        const string CELL = "cellular";

        private bool HasCallback = false;

        public NetworkStatus()
        {
         
        }

        public void getConnectionInfo(string empty)
        {
            HasCallback = true;
            updateConnectionType(checkConnectionType());
        }

        private void updateConnectionType(string type)
        {
            // fire offline/online event
            if (this.HasCallback)
            {
                PluginResult result = new PluginResult(PluginResult.Status.OK, type);
                result.KeepCallback = true;
                DispatchCommandResult(result);
            }
        }

        private string checkConnectionType()
        {
            string connectionType = "";
            string profile = "";
            var GetNetWork = Windows.Networking.Connectivity.NetworkInformation.GetInternetConnectionProfile();
            bool IsNetworkAvailable = System.Net.NetworkInformation.NetworkInterface.GetIsNetworkAvailable();

            if(GetNetWork != null)
            {
                profile = GetNetWork.ProfileName;
                var conLevel = GetNetWork.GetNetworkConnectivityLevel();
                var interfaceType = GetNetWork.NetworkAdapter.IanaInterfaceType;

                if (conLevel == Windows.Networking.Connectivity.NetworkConnectivityLevel.None)
                {
                    connectionType = NONE;
                }
                else
                {
                    switch (interfaceType)
                    {
                        case 71:
                            connectionType = WIFI;
                            break;
                        case 6:
                            connectionType = ETHERNET;
                            break;
                        default:
                            connectionType = UNKNOWN;
                            break;
                    }
                }
            }

            if (profile != "" && IsNetworkAvailable == true)
            {
                return connectionType;
            }
            else
            {
                return NONE;
            }
        }
    }
}
