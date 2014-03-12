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
using Windows.Media.Capture;
using Windows.Storage.Pickers;
using Windows.Storage;
using Windows.Storage.Streams;
using Windows.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;

namespace Windows8PhonegapWinRT.Commands
{
    public class Camera : BaseCommand
    {

        /// <summary>
        /// Return base64 encoded string
        /// </summary>
        private const int DATA_URL = 0;

        /// <summary>
        /// Return file uri
        /// </summary>
        private const int FILE_URI = 1;

        /// <summary>
        /// Choose image from picture library
        /// </summary>
        private const int PHOTOLIBRARY = 0;

        /// <summary>
        /// Take picture from camera
        /// </summary>

        private const int CAMERA = 1;

        /// <summary>
        /// Choose image from picture library
        /// </summary>
        private const int SAVEDPHOTOALBUM = 2;

        /// <summary>
        /// Take a picture of type JPEG
        /// </summary>
        private const int JPEG = 0;

        /// <summary>
        /// Take a picture of type PNG
        /// </summary>
        private const int PNG = 1;

        /// <summary>
        /// Folder to store captured images
        /// </summary>
        private const string isoFolder = "CapturedImagesCache";


        /// <summary>
        /// Represents captureImage action options.
        /// </summary>
        [DataContract]
        public class CameraOptions
        {
            /// <summary>
            /// Source to getPicture from.
            /// </summary>
            [DataMember(IsRequired = false, Name = "sourceType")]
            public int PictureSourceType { get; set; }

            /// <summary>
            /// Format of image that returned from getPicture.
            /// </summary>
            [DataMember(IsRequired = false, Name = "destinationType")]
            public int DestinationType { get; set; }

            /// <summary>
            /// Quality of saved image
            /// </summary>
            [DataMember(IsRequired = false, Name = "quality")]
            public int Quality { get; set; }

            /// <summary>
            /// Controls whether or not the image is also added to the device photo album.
            /// </summary>
            [DataMember(IsRequired = false, Name = "saveToPhotoAlbum")]
            public bool SaveToPhotoAlbum { get; set; }

            /// <summary>
            /// Ignored
            /// </summary>
            [DataMember(IsRequired = false, Name = "correctOrientation")]
            public bool CorrectOrientation { get; set; }



            /// <summary>
            /// Ignored
            /// </summary>
            [DataMember(IsRequired = false, Name = "allowEdit")]
            public bool AllowEdit { get; set; }

            /// <summary>
            /// Height in pixels to scale image
            /// </summary>
            [DataMember(IsRequired = false, Name = "encodingType")]
            public int EncodingType { get; set; }

            /// <summary>
            /// Height in pixels to scale image
            /// </summary>
            [DataMember(IsRequired = false, Name = "mediaType")]
            public int MediaType { get; set; }


            /// <summary>
            /// Height in pixels to scale image
            /// </summary>
            [DataMember(IsRequired = false, Name = "targetHeight")]
            public int TargetHeight { get; set; }


            /// <summary>
            /// Width in pixels to scale image
            /// </summary>
            [DataMember(IsRequired = false, Name = "targetWidth")]
            public int TargetWidth { get; set; }

            /// <summary>
            /// Creates options object with default parameters
            /// </summary>
            public CameraOptions()
            {
                this.SetDefaultValues(new StreamingContext());
            }

            /// <summary>
            /// Initializes default values for class fields.
            /// Implemented in separate method because default constructor is not invoked during deserialization.
            /// </summary>
            /// <param name="context"></param>
            [OnDeserializing()]
            public void SetDefaultValues(StreamingContext context)
            {
                PictureSourceType = CAMERA;
                DestinationType = FILE_URI;
                Quality = 80;
                TargetHeight = -1;
                TargetWidth = -1;
                SaveToPhotoAlbum = false;
                CorrectOrientation = true;
                AllowEdit = false;
                MediaType = -1;
                EncodingType = -1;
            }
        }

        /// <summary>
        /// Camera options
        /// </summary>
        CameraOptions cameraOptions;

        /// <summary>
        /// Used to open photo library
        /// </summary>
        FileOpenPicker photoChooserTask;

        /// <summary>
        /// Used to open camera application
        /// </summary>
        CameraCaptureUI cameraTask;

        public async void takePicture(string options)
        {
            try
            {
                string[] args = JSON.JsonHelper.Deserialize<string[]>(options);
                this.cameraOptions = new CameraOptions();
                this.cameraOptions.Quality = int.Parse(args[0]);
                this.cameraOptions.DestinationType = int.Parse(args[1]);
                this.cameraOptions.PictureSourceType = int.Parse(args[2]);
                this.cameraOptions.TargetWidth = int.Parse(args[3]);
                this.cameraOptions.TargetHeight = int.Parse(args[4]);
                this.cameraOptions.EncodingType = int.Parse(args[5]);
                this.cameraOptions.MediaType = int.Parse(args[6]);
                this.cameraOptions.AllowEdit = bool.Parse(args[7]);
                this.cameraOptions.CorrectOrientation = bool.Parse(args[8]);
                this.cameraOptions.SaveToPhotoAlbum = bool.Parse(args[9]);
            }
            catch (Exception ex)
            {
                this.DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION, ex.Message));
                return;
            }
            if (cameraOptions.PictureSourceType == CAMERA)
            {
                cameraTask = new CameraCaptureUI();
                StorageFile picture = await cameraTask.CaptureFileAsync(CameraCaptureUIMode.Photo);
                if (picture != null)
                {
                    string imagePathOrContent = string.Empty;
                    //save image to picture library
                    if (cameraOptions.SaveToPhotoAlbum)
                    {
                        await picture.CopyAsync(Windows.Storage.KnownFolders.PicturesLibrary, picture.Name, Windows.Storage.NameCollisionOption.GenerateUniqueName);
                    }
                    try
                    {
                        var readStream = await picture.OpenAsync(FileAccessMode.Read);
                        var inputStream = readStream.GetInputStreamAt(0);
                        var dataReaderFile = new DataReader(inputStream);
                        var numByteLoaded = await dataReaderFile.LoadAsync((uint)readStream.Size);
                        var byteString = new byte[numByteLoaded];
                        var imageBase64String = "";
                        dataReaderFile.ReadBytes(byteString);
                        imageBase64String = Convert.ToBase64String(byteString);
                        imagePathOrContent = imageBase64String;
                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK, imagePathOrContent));
                    }
                    catch (Exception)
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, "Error retrieving image."));
                    }

                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.NO_RESULT));
                }
            }
            else
            {
                if ((cameraOptions.PictureSourceType == PHOTOLIBRARY) || (cameraOptions.PictureSourceType == SAVEDPHOTOALBUM))
                {
                    
                    photoChooserTask = new FileOpenPicker();
                    //var picturesLib = Windows.Storage.KnownFolders.PicturesLibrary;
                    photoChooserTask.SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.PicturesLibrary;
                    photoChooserTask.FileTypeFilter.Add(".png");
                    photoChooserTask.FileTypeFilter.Add(".jpg");
                    photoChooserTask.FileTypeFilter.Add(".jpeg");
                    StorageFile selectedfile = await photoChooserTask.PickSingleFileAsync();
                    if (selectedfile != null)
                    {
                        try
                        {
                            string imagePathOrContent = string.Empty;
                            var readStream = await selectedfile.OpenAsync(FileAccessMode.Read);
                            var inputStream = readStream.GetInputStreamAt(0);
                            var dataReaderFile = new DataReader(inputStream);
                            var numByteLoaded = await dataReaderFile.LoadAsync((uint)readStream.Size);
                            var byteString = new byte[numByteLoaded];
                            var imageBase64String = "";
                            dataReaderFile.ReadBytes(byteString);
                            imageBase64String = Convert.ToBase64String(byteString);
                            imagePathOrContent = imageBase64String;
                            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, imagePathOrContent));
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, "Error retrieving image."));
                        }
                    }
                    else
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.NO_RESULT));
                    }
                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.NO_RESULT));
                }
            }


 
        }

        public async void cleanup(string options)
        {
            try
            {
                var Folder = Windows.Storage.ApplicationData.Current.TemporaryFolder;
                var files = await Folder.GetFilesAsync();
                foreach(var file in files)
                {
                    if (file.FileType == ".jpg" || file.FileType == ".png" || file.FileType == ".jpeg")
                    {
                        await file.DeleteAsync();
                    }
                }

                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "Clean up successful"));
            }
            catch (Exception)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, "Unable to clean up"));
            }
        }
    }
}
