using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Windows.Foundation;
using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using System.Threading.Tasks;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=234238

namespace Windows8PhonegapWinRT
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class ExtendedSplashScreen : Page
    {
        public SplashScreen splashScreen;

        public ExtendedSplashScreen()
        {
            this.InitializeComponent();

         //   this.extendedSplashImage.SetValue(Canvas.LeftProperty, splashscreen.ImageLocation.X);
         //   this.extendedSplashImage.SetValue(Canvas.TopProperty, splashscreen.ImageLocation.Y);
         //   this.extendedSplashImage.Height = splashscreen.ImageLocation.Height;
         //   this.extendedSplashImage.Width = splashscreen.ImageLocation.Width;

         //   // Position the extended splash screen's progress ring.
         //   this.ProgressRing.SetValue(Canvas.TopProperty, splashscreen.ImageLocation.Y + splashscreen.ImageLocation.Height + 32);
         //   this.ProgressRing.SetValue(Canvas.LeftProperty,
         //splashscreen.ImageLocation.X +
         //        (splashscreen.ImageLocation.Width / 2) - 15);
        }

        /// <summary>
        /// Invoked when this page is about to be displayed in a Frame.
        /// </summary>
        /// <param name="e">Event data that describes how this page was reached.  The Parameter
        /// property is typically used to configure the page.</param>
         protected override void OnNavigatedTo(NavigationEventArgs e)
        {

            splashScreen = (SplashScreen)(e.Parameter);
            if (splashScreen != null)
            {
                // Register an event handler to be executed when the splash screen has been dismissed.
                splashScreen.Dismissed += new TypedEventHandler<SplashScreen, object>(splashScreen_Dismissed);

                this.extendedSplashImage.SetValue(Canvas.LeftProperty, splashScreen.ImageLocation.X);
                this.extendedSplashImage.SetValue(Canvas.TopProperty, splashScreen.ImageLocation.Y);
                this.extendedSplashImage.Height = splashScreen.ImageLocation.Height;
                this.extendedSplashImage.Width = splashScreen.ImageLocation.Width;

                // Position the extended splash screen's progress ring.
                this.ProgressRing.SetValue(Canvas.TopProperty, splashScreen.ImageLocation.Y + splashScreen.ImageLocation.Height + 32);
                this.ProgressRing.SetValue(Canvas.LeftProperty,
             splashScreen.ImageLocation.X +
                     (splashScreen.ImageLocation.Width / 2) - 15);

                
            }
        }

       
        async void splashScreen_Dismissed(SplashScreen sender, object args)
        {
            //await Task.Delay(TimeSpan.FromSeconds(1));

            await Dispatcher.RunAsync(Windows.UI.Core.CoreDispatcherPriority.Normal, () =>
            {
                Frame.Navigate(typeof(MainPage), this);
                //Window.Current.Content = Frame;
            });
        }

        //internal void splashscreen_Dismissed(SplashScreen sender, object args)
        //{
        //    //removeExtendedSplash();
        //    //rootFrame.Navigate(typeof(MainPage));
        //    //Window.Current.Content = new MainPage();
        //    //Window.Current.Activate();
        //}

    }
}
