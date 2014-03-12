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

namespace Windows8PhonegapWinRT.Commands
{
    public class Accelerometer : BaseCommand
    {
        public const double gConstant = -9.81;

        //private static Windows.Devices.Sensors.Accelerometer accelerometer;

        /// <summary>
        /// Starts listening for acceleration sensor
        /// </summary>
        /// <returns>status of listener</returns>
        public void start(string options)
        {
            var accel = Windows.Devices.Sensors.Accelerometer.GetDefault();
            if (accel != null)
            {
               
                var reading = accel.GetCurrentReading();

                var accelerationx = reading.AccelerationX;
                var accelerationy = reading.AccelerationY;
                var accelerationz = reading.AccelerationZ;

                string resultCoordinates = String.Format("\"x\":{0},\"y\":{1},\"z\":{2}",
                           (accelerationx * gConstant).ToString("0.00000", CultureInfo.InvariantCulture),
                           (accelerationy * gConstant).ToString("0.00000", CultureInfo.InvariantCulture),
                           (accelerationz * gConstant).ToString("0.00000", CultureInfo.InvariantCulture));

                resultCoordinates =  "{" + resultCoordinates + "}";

                PluginResult result = new PluginResult(PluginResult.Status.OK, resultCoordinates);
                result.KeepCallback = true;
                DispatchCommandResult(result);
            }
        }

    

 
    }
}
