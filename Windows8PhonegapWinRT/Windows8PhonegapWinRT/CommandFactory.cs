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
using Windows8PhonegapWinRT.Commands;
using System.Diagnostics;

namespace Windows8PhonegapWinRT
{
    /// <summary>
    /// Provides functionality to create phone gap command by name.
    /// </summary>
    public static class CommandFactory
    {
        /// <summary>
        /// Represents predefined namespace name for custom plugins
        /// </summary>
        ///
 
        //private static readonly string CustomPluginNamespacePrefix = "Cordova.Extension.Commands.";

        private static readonly string BaseCommandNamespacePrefix = "Windows8PhonegapWinRT.Commands.";

        /// <summary>
        /// Cache instantiated commands in a map.
        /// </summary>

        private static Dictionary<string, BaseCommand> commandMap = new Dictionary<string, BaseCommand>();

        /// <summary>
        /// Creates command using command class name. Returns null for unknown commands.
        /// </summary>
        /// <param name="service">Command class name, for example Device or Notification</param>
        /// <returns>Command class instance or null</returns>
        /// 

        public static BaseCommand CreateByServiceName(string service)
        {

            if (string.IsNullOrEmpty(service))
            {
                throw new ArgumentNullException("service", "service to create can't be null");
            }

            if (!commandMap.ContainsKey(service))
            {

                Type t = Type.GetType(BaseCommandNamespacePrefix + service);

                // unknown command, still didn't find it
                if (t == null)
                {
                    Debug.WriteLine("Unable to locate command :: " + service);
                    return null;
                }

                commandMap[service] = Activator.CreateInstance(t) as BaseCommand;
            }

            return commandMap[service];
        }


    }
}
