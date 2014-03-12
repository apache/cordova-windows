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
    public class Device : BaseCommand
    {
        public void getDeviceInfo(string notused)
        {

            string res = String.Format("\"name\":\"{0}\",\"cordova\":\"{1}\",\"platform\":\"{2}\",\"uuid\":\"{3}\",\"version\":\"{4}\",\"model\":\"{5}\"",
                                        this.name,
                                        this.cordova,
                                        this.platform,
                                        this.uuid,
                                        this.version,
                                        this.model);



            res = "{" + res + "}";
            //Debug.WriteLine("Result::" + res);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, res));
        }

        public string model
        {
            get
            {
                return "";
                //return DeviceStatus.DeviceName;
                //return String.Format("{0},{1},{2}", DeviceStatus.DeviceManufacturer, DeviceStatus.DeviceHardwareVersion, DeviceStatus.DeviceFirmwareVersion); 
            }
        }

        public string name
        {
            get
            {
                return "Windows 8";
                //return DeviceStatus.DeviceName;

            }
        }

        public string cordova
        {
            get
            {
                // TODO: should be able to dynamically read the Cordova version from somewhere...
                return "2.3.0";
            }
        }

        public string platform
        {
            get
            {
                return "WinRT";
            }
        }

        public string version
        {
            get
            {
                return "8.0";
            }
        }

        public string uuid
        {
            get
            {
                string returnVal = "";
                returnVal = "???unknown???";
                var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
                if (UserSetting.Values.ContainsKey("DeviceID"))
                {
                    returnVal = UserSetting.Values["DeviceID"].ToString();
                }
                else
                {
                    returnVal = Guid.NewGuid().ToString();
                }

                return returnVal;
            }
        }
    }
}
