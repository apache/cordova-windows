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
using Windows.Devices.Geolocation;

namespace Windows8PhonegapWinRT.Commands
{
    public class Geolocation: BaseCommand
    {
        public async void getLocation(string options)
        {
            try
            {
                Geolocator gl = new Geolocator();
                Geoposition gp = await gl.GetGeopositionAsync();

                var latitude = gp.Coordinate.Latitude;
                var longitude = gp.Coordinate.Longitude;
                var altitude = gp.Coordinate.Altitude;
                var accuracy = gp.Coordinate.Accuracy;
                var heading = gp.Coordinate.Heading;
                if (heading == null)
                {
                    heading = Convert.ToDouble("0");
                }
                else
                {
                    heading = gp.Coordinate.Heading;
                }

                var velocity = gp.Coordinate.Speed;
                if (velocity == null)
                {
                    velocity = Convert.ToDouble("0");
                }
                else
                {
                    velocity = gp.Coordinate.Speed;
                }

                var altitudeAccuracy = gp.Coordinate.AltitudeAccuracy;
                if (altitudeAccuracy == null)
                {
                    altitudeAccuracy = Convert.ToDouble("0");
                }
                else
                {
                    altitudeAccuracy = gp.Coordinate.AltitudeAccuracy;
                }

                string res = String.Format("\"latitude\":\"{0}\",\"longitude\":\"{1}\",\"altitude\":\"{2}\",\"accuracy\":\"{3}\",\"heading\":\"{4}\",\"velocity\":\"{5}\",\"altitudeAccuracy\":\"{6}\"",
                                            latitude,
                                            longitude,
                                            altitude,
                                            accuracy,
                                            heading,
                                            velocity,
                                            altitudeAccuracy);
                res = "{" + res + "}";

                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, res));
            }
            catch(Exception ex)
            {
                this.DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION, ex.Message));
                return;
            }
        }
    }
}
