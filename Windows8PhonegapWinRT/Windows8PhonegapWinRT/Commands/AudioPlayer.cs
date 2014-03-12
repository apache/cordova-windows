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
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using System.Diagnostics;
using Windows.Media.Capture;
using Windows.Media.MediaProperties;
using Windows.Storage;

namespace Windows8PhonegapWinRT.Commands
{
    /// <summary>
    /// Implements audio record and play back functionality.
    /// </summary>
    internal class AudioPlayer 
    {
        private MediaCapture audioCaptureTask;

        double captureAudioDuration = 10;

        #region Constants
        // AudioPlayer states
        private const int PlayerState_None = 0;
        private const int PlayerState_Starting = 1;
        private const int PlayerState_Running = 2;
        private const int PlayerState_Paused = 3;
        private const int PlayerState_Stopped = 4;

        // AudioPlayer messages
        private const int MediaState = 1;
        private const int MediaDuration = 2;
        private const int MediaPosition = 3;
        private const int MediaError = 9;

        //Audio Player errors
        private const int MediaErrorPlayModeSet = 1;
        private const int MediaErrorStartingPlayback = 5;
        private const int MediaErrorResumeState = 6;
        private const int MediaErrorStopState = 8;
        private const int MediaErrorPauseState = 7;
        private const int MediaErrorStartingRecording = 3;

        #endregion

        /// <summary>
        /// Internal flag specified that we should only open audio w/o playing it
        /// </summary>
        private bool prepareOnly = false;

        /// <summary>
        /// The AudioHandler object
        /// </summary>
        private Media handler;

        /// <summary>
        /// The id of this player (used to identify Media object in JavaScript)
        /// </summary>
        private String id;

        /// <summary>
        /// File name to play or record to
        /// </summary>
        private String audioFile = null;


        /// <summary>
        /// Audio player object
        /// </summary>
        private MediaElement player = null;

        /// <summary>
        /// State of recording or playback
        /// </summary>
        private int state = PlayerState_None;

        /// <summary>
        /// Duration of audio
        /// </summary>
        private double duration = -1;

        //TODO: get rid of this callback, it should be universal
        private const string CallbackFunction = "CordovaMediaonStatus";

        /// <summary>
        /// Creates AudioPlayer instance
        /// </summary>
        /// <param name="handler">Media object</param>
        /// <param name="id">player id</param>
        public AudioPlayer(Media handler, String id)
        {
            this.handler = handler;
            this.id = id;
        }


        /// <summary>
        /// Starts or resume playing audio file
        /// </summary>
        /// <param name="filePath">The name of the audio file</param>
        /// <summary>
        /// Starts or resume playing audio file
        /// </summary>
        /// <param name="filePath">The name of the audio file</param>
        /// 
        public async void startPlaying(string filePath)
        {
            //if (this.recorder != null)
            //{
            //    this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaError, MediaErrorRecordModeSet), false);
            //    return;
            //}
            
            if (this.player == null)
            {
                try
                {
                    // this.player is a MediaElement, it must be added to the visual tree in order to play
  
                    Frame frame = Window.Current.Content as Frame;
                    if (frame != null)
                    {
                       Page  page = frame.Content as Page;
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
                                this.player.MediaOpened += MediaOpened;
                                this.player.MediaEnded += MediaEnded;
                                this.player.MediaFailed += MediaFailed;
                            }
                        }
                    };

                    this.audioFile = filePath;
             
                    Uri uri = new Uri( filePath, UriKind.RelativeOrAbsolute);
                    if (uri.IsAbsoluteUri)
                    {                 
                        this.player.Source = uri;                       
                    }
                    else
                    {    
                        StorageFolder sfolder = await Windows.Storage.KnownFolders.MusicLibrary.GetFolderAsync("folder");
                        StorageFile sf = await sfolder.GetFileAsync("1.wav");
                        var stream = await sf.OpenAsync(FileAccessMode.Read);
                        this.player.SetSource(stream, sf.ContentType);                      
                       
                    }
                    this.SetState(PlayerState_Starting);
                }
                catch (Exception e)
                {
                    var error = e.Message.ToString();
                    this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaError, MediaErrorStartingPlayback), false);
                }
            }
            else
            {             
                if (this.state != PlayerState_Running)
                {
                    this.player.Play();
                    this.SetState(PlayerState_Running);
                }
            }
        }

        private void MediaFailed(object sender, ExceptionRoutedEventArgs e)
        {
            this.SetState(PlayerState_Stopped);
        }

        private void MediaEnded(object sender, RoutedEventArgs e)
        {
            player.Stop();
            this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaError.ToString(), "Media failed"), false);
        }

        private void MediaOpened(object sender, RoutedEventArgs e)
        {
            if (this.player != null)
            {
                this.duration = this.player.NaturalDuration.TimeSpan.TotalSeconds;
                this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaDuration, this.duration), false);
                if (!this.prepareOnly)
                {
                    this.player.Play();
                    this.SetState(PlayerState_Running);
                }
                this.prepareOnly = false;
            }
            else
            {
                // TODO: occasionally MediaOpened is signalled, but player is null
            }
        }

        /// <summary>
        /// Gets current position of playback
        /// </summary>
        /// <returns>current position</returns>
        public double getCurrentPosition()
        {
            if ((this.state == PlayerState_Running) || (this.state == PlayerState_Paused))
            {
                double currentPosition = this.player.Position.TotalSeconds;
                 return currentPosition;
            }
            else
            {
                return 0;
            }
        }

        /// <summary>
        /// Sets the state and send it to JavaScript
        /// </summary>
        /// <param name="state">state</param>
        private void SetState(int state)
        {
            if (this.state != state)
            {
                this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaState, state), false);
            }

            this.state = state;
        }

        /// <summary>
        /// Pauses playing
        /// </summary>
        public void pausePlaying()
        {
            if (this.state == PlayerState_Running)
            {
                this.player.Pause();
                this.SetState(PlayerState_Paused);
            }
        }

        /// <summary>
        /// Stops playing the audio file
        /// </summary>
        public void stopPlaying()
        {
            if ((this.state == PlayerState_Running) || (this.state == PlayerState_Paused))
            {
                this.player.Stop();

                this.player.Position = new TimeSpan(0L);
                this.SetState(PlayerState_Stopped);
            }
        }


        /// <summary>
        /// Seek or jump to a new time in the track
        /// </summary>
        /// <param name="milliseconds">The new track position</param>
        public void seekToPlaying(int milliseconds)
        {
            if (this.player != null)
            {
                TimeSpan tsPos = new TimeSpan(0, 0, 0, 0, milliseconds);
                this.player.Position = tsPos;
                this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaPosition, milliseconds / 1000.0f), false);
            }
        }

        /// <summary>
        /// Starts recording, data is stored in memory
        /// </summary>
        /// <param name="filePath"></param>
        public async void startRecording(string filePath)
        {
            if (this.player != null)
            {
                this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaError, MediaErrorPlayModeSet), false);
            }
            else 
                try
                {
                    var mediaCaputreSettings = new MediaCaptureInitializationSettings();
                    mediaCaputreSettings.StreamingCaptureMode = StreamingCaptureMode.Audio;
                    audioCaptureTask = new MediaCapture();
                    await audioCaptureTask.InitializeAsync(mediaCaputreSettings);

                    var mediaEncodingProfile = MediaEncodingProfile.CreateMp3(AudioEncodingQuality.Auto);
                    var storageFile = await KnownFolders.MusicLibrary.CreateFolderAsync("folder", CreationCollisionOption.OpenIfExists);
                    var storageFile1 = await storageFile.CreateFileAsync("1.wav", CreationCollisionOption.ReplaceExisting);

                    var timer = new Windows.UI.Xaml.DispatcherTimer();
                    timer.Tick += async delegate(object sender, object e)
                    {
                        timer.Stop();
                        await audioCaptureTask.StopRecordAsync();
                        this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaState, PlayerState_Stopped), false);

                        if (storageFile != null)
                        {
                        }
                    };
                    timer.Interval = TimeSpan.FromMilliseconds(captureAudioDuration * 1000);


                    await audioCaptureTask.StartRecordToStorageFileAsync(mediaEncodingProfile, storageFile1);
                    timer.Start();

                    this.SetState(PlayerState_Running);
                }
                catch (Exception)
                {
                    this.handler.InvokeCustomScript(new ScriptCallback(CallbackFunction, this.id, MediaError, MediaErrorStartingRecording), false);
                }
        
        }

        /// <summary>
        /// Stops recording
        /// </summary>
        public void stopRecording()
        {
          
                if (this.state == PlayerState_Running)
                {
                    try
                    {
                        this.SetState(PlayerState_Stopped);
                    }
                    catch (Exception)
                    {
                        //TODO 
                    }
                }
          //  }
        }





    }
}
