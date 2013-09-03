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
using System.Runtime.Serialization;
using Windows.UI.Xaml.Media.Imaging;
using Windows.Storage;
using Windows.Storage.FileProperties;
using Windows.Media.Capture;
using Windows.Storage.Streams;
using Windows.Media.MediaProperties;

namespace Windows8PhonegapWinRT.Commands
{
    public class Capture : BaseCommand
    {
        #region Internal classes (options and resultant objects)

        /// <summary>
        /// Represents captureImage action options.
        /// </summary>
        [DataContract]
        public class CaptureImageOptions
        {
            /// <summary>
            /// The maximum number of images the device user can capture in a single capture operation. The value must be greater than or equal to 1 (default to 1).
            /// </summary>
            [DataMember(IsRequired = false, Name = "limit")]
            public int Limit { get; set; }

            public static CaptureImageOptions Default
            {
                get { return new CaptureImageOptions() { Limit = 1 }; }
            }
        }

        /// <summary>
        /// Represents captureVideo action options.
        /// </summary>
        [DataContract]
        public class CaptureVideoOptions
        {
            /// <summary>
            /// The maximum number of video files the device user can capture in a single capture operation. The value must be greater than or equal to 1 (default to 1).
            /// </summary>
            [DataMember(IsRequired = false, Name = "limit")]
            public int Limit { get; set; }

            public static CaptureVideoOptions Default
            {
                get { return new CaptureVideoOptions() { Limit = 1 }; }
            }

        } 

        /// <summary>
        /// Represents captureAudio action options.
        /// </summary>
        [DataContract]
        public class CaptureAudioOptions
        {
            /// <summary>
            /// The maximum number of audio files the device user can capture in a single capture operation. The value must be greater than or equal to 1 (defaults to 1).
            /// </summary>
            [DataMember(IsRequired = false, Name = "limit")]
            public int Limit { get; set; }

            public static CaptureAudioOptions Default
            {
                get { return new CaptureAudioOptions() { Limit = 1 }; }
            }
        }


        /// <summary>
        /// Store image info
        /// </summary>
        [DataContract]
        public class MediaFile
        {
            [DataMember(Name = "name")]
            public string FileName { get; set; }

            [DataMember(Name = "fullPath")]
            public string FilePath { get; set; }

            [DataMember(Name = "type")]
            public string Type { get; set; }

            [DataMember(Name = "lastModifiedDate")]
            public string LastModifiedDate { get; set; }

            [DataMember(Name = "size")]
            public long Size { get; set; }

            public MediaFile(string filepath, string imgType, string name, long size, string lastModDate)
            {
                //var basicProperties = imgFile.GetBasicPropertiesAsync();

                this.FilePath = filepath;
                this.FileName = name;
                this.Type = imgType;
                this.Size = size;
                this.LastModifiedDate = lastModDate;

            }
        }
        #endregion

        /////<summary>
        /////Folder to store captured images
        /////</summary>
        //private string isoFolder = "CapturedImagesCache";

        ///<summary>
        ///Capture Image options
        ///</summary>
        private CaptureImageOptions captureImageOptions;

        ///<summary>
        ///Capture Video options
        ///</summary>
        protected CaptureVideoOptions captureVideoOptions;

        ///<summary>
        ///Capture Video options
        ///</summary>
        protected CaptureAudioOptions captureAudioOptions;

        ///<summary>
        /// Use to open camera application
        ///</summary>
        private CameraCaptureUI cameraTask;

        /// <summary>
        /// Used for audio recording
        /// </summary>
        private MediaCapture audioCaptureTask;

        /// <summary>
        /// Time in second for audio recording
        /// </summary>
        double captureAudioDuration = 5;

        ///<summary>
        ///Stores information about captured files
        ///</summary>
        List<MediaFile> files = new List<MediaFile>();


        ///<summary>
        ///Lunch default camera application to capture image
        ///</summary>
        ///<param name="options">may contains limit of mode parameters</param>
        ///
        public async void captureImage(string options)
        {
            try
            {
                try
                {
                    string args = JSON.JsonHelper.Deserialize<string[]>(options)[0];
                    this.captureImageOptions = String.IsNullOrEmpty(args) ? CaptureImageOptions.Default : JSON.JsonHelper.Deserialize<CaptureImageOptions>(args);
                }
                catch (Exception ex)
                {
                    this.DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION, ex.Message));
                    return;
                }

                cameraTask = new CameraCaptureUI();
                cameraTask.PhotoSettings.AllowCropping = true;
                cameraTask.PhotoSettings.MaxResolution = CameraCaptureUIMaxPhotoResolution.HighestAvailable;
                cameraTask.PhotoSettings.Format = CameraCaptureUIPhotoFormat.Jpeg;

                StorageFile picture = await cameraTask.CaptureFileAsync(CameraCaptureUIMode.Photo);

                if (picture != null)
                {
                    await picture.CopyAsync(Windows.Storage.KnownFolders.PicturesLibrary, picture.Name, Windows.Storage.NameCollisionOption.GenerateUniqueName);

                    long size = 0;
                    string modifiedDate = "";
                    var tasks = new List<Task<BasicProperties>>();
                    tasks.Add(picture.GetBasicPropertiesAsync().AsTask());
                    var result = await Task.WhenAll(tasks);
                    foreach (var prop in result)
                    {
                        size = (long)prop.Size;
                        modifiedDate = prop.DateModified.ToString();
                    }

                    string imagePathOrContent = string.Empty;
                    var readStream = await picture.OpenAsync(FileAccessMode.Read);
                    var inputStream = readStream.GetInputStreamAt(0);
                    var dataReaderFile = new DataReader(inputStream);
                    var numByteLoaded = await dataReaderFile.LoadAsync((uint)readStream.Size);
                    var byteString = new byte[numByteLoaded];
                    var imageBase64String = "";
                    dataReaderFile.ReadBytes(byteString);
                    imageBase64String = Convert.ToBase64String(byteString);
                    imagePathOrContent = "data:image/jpeg;base64," + imageBase64String;

                    MediaFile data = new MediaFile(imagePathOrContent, picture.ContentType, picture.Name, size, modifiedDate);

                    this.files.Add(data);

                    if (files.Count < this.captureImageOptions.Limit)
                    {
                        //dosomething here
                    }
                    else
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK, files));
                        files.Clear();
                    }

                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, "Error in capturing image"));
                }
            }
            catch (Exception ex)
            {
                var error = ex.Message.ToString();
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, "Error capturing image."));
            }

        }

        /// <summary>
        /// Launches our own video recording control to capture video
        /// </summary>
        /// <param name="options">may contains additional parameters</param>
        public async void captureVideo(string options)
        {
            try
            {
                try
                {
                    string args = JSON.JsonHelper.Deserialize<string[]>(options)[0];
                    this.captureVideoOptions = String.IsNullOrEmpty(args) ? CaptureVideoOptions.Default : JSON.JsonHelper.Deserialize<CaptureVideoOptions>(args);
                }
                catch (Exception ex)
                {
                    this.DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION, ex.Message));
                    return;
                }

                cameraTask = new CameraCaptureUI();
                cameraTask.VideoSettings.AllowTrimming = true;
                cameraTask.VideoSettings.Format = CameraCaptureUIVideoFormat.Mp4;

                StorageFile video = await cameraTask.CaptureFileAsync(CameraCaptureUIMode.Video);

                if (video != null)
                {
                    await video.CopyAsync(Windows.Storage.KnownFolders.VideosLibrary, video.Name, Windows.Storage.NameCollisionOption.GenerateUniqueName);

                    long size = 0;
                    string modifiedDate = "";
                    var tasks = new List<Task<BasicProperties>>();
                    tasks.Add(video.GetBasicPropertiesAsync().AsTask());
                    var result = await Task.WhenAll(tasks);
                    foreach (var prop in result)
                    {
                        size = (long)prop.Size;
                        modifiedDate = prop.DateModified.ToString();
                    }

                    MediaFile data = new MediaFile(video.Path, video.ContentType, video.Name, size, modifiedDate);

                    this.files.Add(data);

                    if (files.Count < this.captureVideoOptions.Limit)
                    {
                        //dosomething here
                    }
                    else
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK, files));
                        files.Clear();
                    }
                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, "Error in capturing video"));
                }

            }
            catch (Exception ex)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, ex.Message));
            }
        }

        public async void captureAudio(string options)
        {
            try
            {
                try
                {
                    string args = JSON.JsonHelper.Deserialize<string[]>(options)[0];
                    this.captureAudioOptions = String.IsNullOrEmpty(args) ? CaptureAudioOptions.Default : JSON.JsonHelper.Deserialize<CaptureAudioOptions>(args);
                }
                catch (Exception ex)
                {
                    this.DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION, ex.Message));
                    return;
                }

                var mediaCaputreSettings = new MediaCaptureInitializationSettings();
                mediaCaputreSettings.StreamingCaptureMode = StreamingCaptureMode.Audio;
                audioCaptureTask = new MediaCapture();
                await audioCaptureTask.InitializeAsync(mediaCaputreSettings);

                var mediaEncodingProfile = MediaEncodingProfile.CreateMp3(AudioEncodingQuality.Auto);
                var storageFile = await KnownFolders.MusicLibrary.CreateFileAsync("captureAudio.mp3", CreationCollisionOption.GenerateUniqueName);
                
                var timer = new Windows.UI.Xaml.DispatcherTimer();
                timer.Tick += async delegate(object sender, object e)
                {
                    timer.Stop();
                    await audioCaptureTask.StopRecordAsync();

                    if (storageFile != null)
                    {
                        long size = 0;
                        string modifiedDate = "";
                        var tasks = new List<Task<BasicProperties>>();
                        tasks.Add(storageFile.GetBasicPropertiesAsync().AsTask());
                        var result = await Task.WhenAll(tasks);
                        foreach (var prop in result)
                        {
                            size = (long)prop.Size;
                            modifiedDate = prop.DateModified.ToString();
                        }

                        string imagePathOrContent = string.Empty;
                        var readStream = await storageFile.OpenAsync(FileAccessMode.Read);
                        var inputStream = readStream.GetInputStreamAt(0);
                        var dataReaderFile = new DataReader(inputStream);
                        var numByteLoaded = await dataReaderFile.LoadAsync((uint)readStream.Size);
                        var byteString = new byte[numByteLoaded];
                        var imageBase64String = "";
                        dataReaderFile.ReadBytes(byteString);
                        imageBase64String = Convert.ToBase64String(byteString);
                        imagePathOrContent = "data:audio/mpeg;base64," + imageBase64String;

                        MediaFile data = new MediaFile(imagePathOrContent, storageFile.ContentType, storageFile.Name, size, modifiedDate);

                        this.files.Add(data);

                        if (files.Count < this.captureAudioOptions.Limit)
                        {
                            //dosomething here
                        }
                        else
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, files));
                            files.Clear();
                        }
                    }
                };
                timer.Interval = TimeSpan.FromMilliseconds(captureAudioDuration * 1000);
                

                await audioCaptureTask.StartRecordToStorageFileAsync(mediaEncodingProfile, storageFile);
                timer.Start();

                   
                
                
            }
            catch (Exception ex)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, ex.Message));
            }
        }

    }
}
