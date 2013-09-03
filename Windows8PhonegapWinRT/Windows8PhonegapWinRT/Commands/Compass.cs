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
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Devices.Sensors;

namespace Windows8PhonegapWinRT.Commands
{
    public class Compass : BaseCommand
    {
        private static Windows.Devices.Sensors.Compass compass;
        
        public const int Not_Supported = 20;      

        public void getHeading(string options)
        {
            compass = Windows.Devices.Sensors.Compass.GetDefault();
            if (compass == null)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, "{code:" + Not_Supported + "}"));
            }
            else
            {

                var reading = compass.GetCurrentReading();

                var magneticheading = reading.HeadingMagneticNorth;
                var trueheading = reading.HeadingTrueNorth;
                var headingaccuracy = magneticheading - trueheading;

                string result = String.Format("\"magneticHeading\":{0},\"headingAccuracy\":{1},\"trueHeading\":{2}",
                               magneticheading.ToString(),
                               headingaccuracy.ToString(),
                               trueheading.ToString());

                result = "{" + result + "}";

                PluginResult Result = new PluginResult(PluginResult.Status.OK, result);
                DispatchCommandResult(Result);
            }
        }
    }
}
