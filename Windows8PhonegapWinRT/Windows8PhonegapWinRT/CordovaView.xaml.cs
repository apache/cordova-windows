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
using System.IO;
using System.Linq;
using System.ComponentModel;
using Windows.UI.Xaml.Controls;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using System.Diagnostics;



// The User Control item template is documented at http://go.microsoft.com/fwlink/?LinkId=234236

namespace Windows8PhonegapWinRT
{
    public partial class CordovaView : UserControl
    {

        /// <summary>
        /// Indicates whether web control has been loaded and no additional initialization is needed.
        /// Prevents data clearing during page transitions.
        /// </summary>
        private bool IsBrowserInitialized = false;

        //private static string AppRoot = "";

        /// <summary>
        /// Handles native api calls
        /// </summary>
        /// 
        private NativeExecution nativeExecution;

        protected BrowserMouseHelper bmHelper;

        protected DOMStorageHelper domStorageHelper;
        //protected OrientationHelper orientationHelper;

        public Windows.UI.Xaml.Controls.Grid _LayoutRoot
        {
            get
            {
                return ((Windows.UI.Xaml.Controls.Grid)(this.FindName("LayoutRoot")));
            }
        }

        public WebView Browser
        {
            get
            {
                return CordovaBrowser;
            }
        }

        /*
         * Setting StartPageUri only has an effect if called before the view is loaded.
         **/
        protected Uri _startPageUri = null;

        public Uri StartPageUri
        {
            get
            {
                if (_startPageUri == null)
                {
                    // default
                    //return new Uri(AppRoot + "www/index.html", UriKind.Relative);
                    return new Uri("ms-appx-web:///www/index.html");
                }
                else
                {
                    return _startPageUri;
                }
            }
            set
            {
                if (!this.IsBrowserInitialized)
                {
                    _startPageUri = value;
                }
            }
        }

        /// <summary>
        /// Gets or sets whether to suppress bouncy scrolling of
        /// the WebBrowser control;
        /// </summary>
        public bool DisableBouncyScrolling
        {
            get;
            set;
        }

        public CordovaView()
        {
            InitializeComponent();
            var service = App.Current;
            service.Suspending += service_Suspending;
            service.Resuming += service_Resuming;

            var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
            UserSetting.Values["IsAlertVisible"] = "false";
            this.nativeExecution = new NativeExecution(ref this.CordovaBrowser);
            this.bmHelper = new BrowserMouseHelper(ref this.CordovaBrowser);
            
        }

        private void service_Resuming(object sender, object e)
        {
            Debug.WriteLine("INFO: AppActivated");
            try
            {
                CordovaBrowser.InvokeScript("eval", new string[] { "cordova.fireDocumentEvent('resume');" });
            }
            catch (Exception)
            {
                Debug.WriteLine("ERROR: Resume event error");
            }
        }

        private void service_Suspending(object sender, Windows.ApplicationModel.SuspendingEventArgs e)
        {
            Debug.WriteLine("INFO: AppDeactivated");

            try
            {
                CordovaBrowser.InvokeScript("eval", new string[] { "cordova.fireDocumentEvent('pause');" });
            }
            catch (Exception)
            {
                Debug.WriteLine("ERROR: Pause event error");
            }
        }

        private void GapBrowser_Loaded(object sender, RoutedEventArgs e)
        {
            this.bmHelper.ScrollDisabled = this.DisableBouncyScrolling;

            // prevents refreshing web control to initial state during pages transitions
            if (this.IsBrowserInitialized) return;

            this.domStorageHelper = new DOMStorageHelper(this.CordovaBrowser);

            string deviceUUID = "";
            var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
            if (!UserSetting.Values.ContainsKey("DeviceID"))
            {
                UserSetting.Values["DeviceID"] = Guid.NewGuid().ToString();
                deviceUUID = UserSetting.Values["DeviceID"].ToString();
            }
            else
            {
                deviceUUID = UserSetting.Values["DeviceID"].ToString();
            }

            CordovaBrowser.Navigate(StartPageUri);

            IsBrowserInitialized = true;


        }


        

        public void HideWebView()
        {
            CordovaBrowser.Visibility = Windows.UI.Xaml.Visibility.Collapsed;
        }

        public void ViewWebView()
        {
            CordovaBrowser.Visibility = Windows.UI.Xaml.Visibility.Visible;
        }

        private void GapBrowser_Unloaded(object sender, RoutedEventArgs e)
        {

        }

        /*
         *  This method does the work of routing commands
         *  NotifyEventArgs.Value contains a string passed from JS 
         *  If the command already exists in our map, we will just attempt to call the method(action) specified, and pass the args along
         *  Otherwise, we create a new instance of the command, add it to the map, and call it ...
         *  This method may also receive JS error messages caught by window.onerror, in any case where the commandStr does not appear to be a valid command
         *  it is simply output to the debugger output, and the method returns.
         * 
         **/
        private void GapBrowser_ScriptNotify(object sender, NotifyEventArgs e)
        {
            string commandStr = e.Value;
            

            if (commandStr.IndexOf("DOMStorage") == 0)
            {
                this.domStorageHelper.HandleStorageCommand(commandStr);
                return;
            }

            CordovaCommandCall commandCallParams = CordovaCommandCall.Parse(commandStr);

            if (commandCallParams == null)
            {
                // ERROR
                Debug.WriteLine("ScriptNotify :: " + commandStr);
            }
            else
            {
                this.nativeExecution.ProcessCommand(commandCallParams);

                string AlertVisible = "false";
                var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
                AlertVisible = UserSetting.Values["IsAlertVisible"].ToString();
                
                if (AlertVisible == "false")
                {
                    ViewWebView();
                }
                if (AlertVisible == "true")
                {
                    HideWebView();
                }
            }
        }

        private void GapBrowser_LoadCompleted(object sender, NavigationEventArgs e)
        {
            string nativeReady = "(function(){ cordova.require('cordova/channel').onNativeReady.fire()})();";

            try
            {
                var unloadFunc = "(function(){ function navigating(){ window.external.notify('%%' + location.href);} window.onbeforeunload=navigating;return location.href;})();";
                var host = CordovaBrowser.InvokeScript("eval", new string[] { unloadFunc });
                CordovaBrowser.AllowedScriptNotifyUris = new[] { new Uri(host) };

                CordovaBrowser.InvokeScript("execScript", new string[] { nativeReady });
            }
            catch (Exception /*ex*/)
            {
                Debug.WriteLine("Error calling js to fire nativeReady event. Did you include cordova-x.x.x.js in your html script tag?");
            }

            if (this.CordovaBrowser.Opacity < 1)
            {
                this.CordovaBrowser.Opacity = 1;
            }

            
        }

        private void GapBrowser_NavigationFailed(object sender, WebViewNavigationFailedEventArgs e)
        {
            Debug.WriteLine("GapBrowser_NavigationFailed :: " + e.Uri.ToString());
        }
    }
}
