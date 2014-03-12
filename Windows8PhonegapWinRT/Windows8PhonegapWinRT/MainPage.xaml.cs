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
using Windows.UI.Xaml.Media.Animation;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=234238

namespace Windows8PhonegapWinRT
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public partial class MainPage : Page
    {
        public MainPage()
        {
            InitializeComponent();
            this.PGView.Loaded += GapBrowser_Loaded;
                
        }

        /// <summary>
        /// Invoked when this page is about to be displayed in a Frame.
        /// </summary>
        /// <param name="e">Event data that describes how this page was reached.  The Parameter
        /// property is typically used to configure the page.</param>
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
        }

        private void GapBrowser_Loaded(object sender, RoutedEventArgs e)
        {
            this.PGView.Loaded -= GapBrowser_Loaded;
            //this.PGView.Loaded -= GapBrowser_Loaded;
            //Storyboard _storyBoard = new Storyboard();
            //DoubleAnimation animation = new DoubleAnimation()
            //{
            //    From = 0,
            //    Duration = TimeSpan.FromSeconds(0.6),
            //    To = 90
            //};
            //Storyboard.SetTarget(animation, SplashProjector);
            //Storyboard.SetTargetProperty(animation, "RotationY");
            //_storyBoard.Children.Add(animation);
            //_storyBoard.Begin();
            //_storyBoard.Completed += Splash_Completed;
        }

        //void Splash_Completed(object sender, object e)
        //{
        //    (sender as Storyboard).Completed -= Splash_Completed;
        //    LayoutRoot.Children.Remove(SplashImage);
        //}

    }
}
