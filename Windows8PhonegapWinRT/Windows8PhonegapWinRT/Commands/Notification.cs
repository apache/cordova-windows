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
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows8PhonegapWinRT.UI;
using Windows.System.Threading;
using System.Diagnostics;
using Windows.UI.Popups;



namespace Windows8PhonegapWinRT.Commands
{
   public class Notification : BaseCommand
    {
       const int DEFAULT_DURATION = 5;

       private NotificationBox notifBox;

       /// <summary>
       /// Audio player object
       /// </summary>
       private MediaElement player = null;

       private Page Page
       {
           get
           {
               Page page = null;
               Frame frame = Window.Current.Content as Frame;
               if (frame != null)
               {
                   page = frame.Content as Page;
               }
               return page;
           }
       }


        [DataContract]
        public class AlertOptions
        {
            [OnDeserializing]
            public void OnDeserializing(StreamingContext context)
            {
                // set defaults
                this.message = "message";
                this.title = "Alert";
                this.buttonLabel = "ok";
            }
            /// <summary>
            /// message to display in the alert box
            /// </summary>
            [DataMember]
            public string message;

            /// <summary>
            /// title displayed on the alert window
            /// </summary>
            [DataMember]
            public string title;

            /// <summary>
            /// text to display on the button
            /// </summary>
            [DataMember]
            public string buttonLabel;
        }

        public async void alert(string options)
        {
            string[] args = JSON.JsonHelper.Deserialize<string[]>(options);
            AlertOptions alertOpts = new AlertOptions();
            alertOpts.message = args[0];
            alertOpts.title = args[1];
            alertOpts.buttonLabel = args[2];

            
            MessageDialog md = new MessageDialog(alertOpts.message, alertOpts.title);
            md.Commands.Add(new UICommand(alertOpts.buttonLabel,OkHandler));
            await md.ShowAsync();
                //Page page = Page;
                //if (page != null)
                //{
                //    Grid grid = page.FindName("LayoutRoot") as Grid;
                //    if (grid != null)
                //    {
                //        notifBox = new NotificationBox();
                //        notifBox.PageTitle.Text = alertOpts.title;
                //        notifBox.SubTitle.Text = alertOpts.message;
                //        Button btnOK = new Button();
                //        btnOK.Content = alertOpts.buttonLabel;
                //        btnOK.Click += new RoutedEventHandler(btnOK_Click);
                //        btnOK.Tag = 1;
                //        notifBox.ButtonPanel.Children.Add(btnOK);  
                //        //grid.Loaded += grid_Loaded;
                //        grid.Children.Add(notifBox);
                //        var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
                //        UserSetting.Values["IsAlertVisible"] = "true";
                //    }
                //}
                //else
                //{
                //    DispatchCommandResult(new PluginResult(PluginResult.Status.INSTANTIATION_EXCEPTION));
                //}
        }

        private void OkHandler(IUICommand command)
        {
            string retVal = command.Label;

            var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
            UserSetting.Values["IsAlertVisible"] = "false";
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, retVal));
        }

       

        //private void btnOK_Click(object sender, RoutedEventArgs e)
        //{
        //    Button btn = sender as Button;
        //    int retVal = 0;
        //    if (btn != null)
        //    {
        //        retVal = (int)btn.Tag + 1;
        //    }
        //    if (notifBox != null)
        //    {
        //        Page page = Page;
        //        if (page != null)
        //        {
        //            Grid grid = page.FindName("LayoutRoot") as Grid;
        //            if (grid != null)
        //            {
        //                grid.Children.Remove(notifBox);
        //            }
        //        }
        //        notifBox = null;
        //        var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
        //        UserSetting.Values["IsAlertVisible"] = "false";

        //    }
        //    DispatchCommandResult(new PluginResult(PluginResult.Status.OK, retVal));
        //}

        public async void confirm(string options)
        {
            string[] args = JSON.JsonHelper.Deserialize<string[]>(options);
            AlertOptions alertOpts = new AlertOptions();
            alertOpts.message = args[0];
            alertOpts.title = args[1];
            alertOpts.buttonLabel = args[2];
            string[] labels = alertOpts.buttonLabel.Split(',');

            MessageDialog md = new MessageDialog(alertOpts.message, alertOpts.title);
            md.Commands.Add(new UICommand(labels[0], OkHandler));
            md.Commands.Add(new UICommand(labels[1], CancelHandler));
            await md.ShowAsync();    
                
            //Page page = Page;
            //if (page != null)
            //{
            //    Grid grid = page.FindName("LayoutRoot") as Grid;
            //    if (grid != null)
            //    {
            //        notifBox = new NotificationBox();
            //        notifBox.PageTitle.Text = alertOpts.title;
            //        notifBox.SubTitle.Text = alertOpts.message;

            //        string[] labels = alertOpts.buttonLabel.Split(',');
            //        for (int n = 0; n < labels.Length; n++)
            //        {
            //            Button btn = new Button();
            //            btn.Content = labels[n];
            //            btn.Tag = n;
            //            btn.Click += new RoutedEventHandler(btnOK_Click);
            //            notifBox.ButtonPanel.Children.Add(btn);
            //        }

            //        grid.Children.Add(notifBox);
            //        var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
            //        UserSetting.Values["IsAlertVisible"] = "true";
                       
            //    }
                //}
                //else
                //{
                //    DispatchCommandResult(new PluginResult(PluginResult.Status.INSTANTIATION_EXCEPTION));
                //}
        }

        private void CancelHandler(IUICommand command)
        {
            string retVal = command.Label;

            var UserSetting = Windows.Storage.ApplicationData.Current.LocalSettings;
            UserSetting.Values["IsAlertVisible"] = "false";
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, retVal));
        }

        public async void beep(string options)
        {
            string[] args = JSON.JsonHelper.Deserialize<string[]>(options);
            int times = int.Parse(args[0]);
            string filePath = "ms-appx:///Music/beep1.mp3";
            try
            {
                Frame frame = Window.Current.Content as Frame;
                if (frame != null)
                {
                    Page page = frame.Content as Page;
                    if (page != null)
                    {
                        Grid grid = page.FindName("LayoutRoot") as Grid;
                        if (grid != null)
                        {
                            this.player = grid.FindName("playerMediaElement") as MediaElement;
                            if (this.player == null) // still null ?
                            {
                                this.player = new MediaElement();
                                this.player.Name = "playerMediaElement";
                                grid.Children.Add(this.player);
                                this.player.Visibility = Visibility.Visible;
                            }
                            if (this.player.CurrentState == Windows.UI.Xaml.Media.MediaElementState.Playing)
                            {
                                this.player.Stop(); // stop it!
                            }
                            this.player.Source = null; // Garbage collect it.
                        }
                    }
                };

                Uri uri = new Uri(filePath, UriKind.RelativeOrAbsolute);
                do
                {
                    this.player.Source = uri;
                    this.player.Play();
                    await Task.Delay(TimeSpan.FromSeconds(0.7));
                    this.player.Stop();
                }
                while (--times > 0);
            }
            catch (Exception e)
            {
                var error = e.Message.ToString();
                Debug.WriteLine(error);
            }
            DispatchCommandResult();
        }

        public void vibrate(string options)
        {
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "logoff"));
        }
    }
}
