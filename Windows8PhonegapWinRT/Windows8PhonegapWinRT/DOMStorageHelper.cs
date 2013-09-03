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
using System.IO;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.Storage;
using Windows8PhonegapWinRT.JSON;


/*
 * Translates DOMStorage API between JS and Isolated Storage
 * Missing pieces : QUOTA_EXCEEDED_ERR  + StorageEvent  
 * */

namespace Windows8PhonegapWinRT
{
    public class DOMStorageHelper
    {
        protected WebView webView1;
        
        

        public DOMStorageHelper(WebView gapBrowser)
        {
            
            this.webView1 = gapBrowser;
            // always clear session at creation
            var UserSettings = Windows.Storage.ApplicationData.Current.LocalSettings;
            UserSettings.Values["sessionStorage"] = "";
            UserSettings.Values["localStorage"] = "";

            //Application.Current.Suspending += new EventHandler(OnAppExit);
        }

        protected Dictionary<string, string> getStorageByType(string type)
        {
            var UserSettings = Windows.Storage.ApplicationData.Current.LocalSettings;
            UserSettings.Values[type] = new Dictionary<string, string>();
            
            return UserSettings.Values[type] as Dictionary<string, string>;
        }


        public void HandleStorageCommand(string commandStr)
        {

            string[] split = commandStr.Split('/');
            var UserSettings = Windows.Storage.ApplicationData.Current.LocalSettings;
            if (split.Length > 3)
            {
                string api = split[0];
                string type = split[1]; // localStorage || sessionStorage
                string command = split[2];
                string param = split[3];

                Dictionary<string, string> currentStorage = getStorageByType(type);

                switch (command)
                {
                    case "get":
                        {

                            if (currentStorage.Keys.Contains(param))
                            {
                                string value = currentStorage[param];
                                string[] arg = { "window." + type + ".onResult('" + param + "','" + value + "');"};
                                webView1.InvokeScript("execScript",arg);
                            }
                            else
                            {
                                string[] arg = {"window." + type + ".onResult('" + param + "');"};
                                webView1.InvokeScript("execScript", arg);
                            }

                        }
                        break;
                    case "load":
                        {
                            string[] keys = currentStorage.Keys.ToArray();
                            string jsonString = JsonHelper.Serialize(keys);
                            string[] callbackJS = {"window." + type + ".onKeysChanged('" + jsonString + "');"};
                            webView1.InvokeScript("execScript", callbackJS);
                        }
                        break;
                    case "set":
                        {
                            // TODO: check that length is not out of bounds
                            currentStorage[param] = split[4];
                            //UserSettings.Save();
                            string[] keys = currentStorage.Keys.ToArray();
                            string jsonString = JsonHelper.Serialize(keys);
                            string[] callbackJS = { "window." + type + ".onKeysChanged('" + jsonString + "');"};
                            webView1.InvokeScript("execScript", callbackJS);
                        }
                        break;
                    case "remove":
                        currentStorage.Remove(param);
                       // UserSettings.Save();
                        break;
                    case "clear":
                        currentStorage = new Dictionary<string, string>();
                        UserSettings.Values[type] = currentStorage;
                        //UserSettings.Save();
                        break;
                }

            }

        }

    }
}
