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
using System.Diagnostics;
using System.Security;
using System.IO;
using Windows.Storage;
using Windows.Storage.Streams;
using Windows.Storage.FileProperties;

namespace Windows8PhonegapWinRT.Commands
{
     public class File : BaseCommand
    {
        // Error codes
        public const int NOT_FOUND_ERR = 1;
        public const int SECURITY_ERR = 2;
        public const int ABORT_ERR = 3;
        public const int NOT_READABLE_ERR = 4;
        public const int ENCODING_ERR = 5;
        public const int NO_MODIFICATION_ALLOWED_ERR = 6;
        public const int INVALID_STATE_ERR = 7;
        public const int SYNTAX_ERR = 8;
        public const int INVALID_MODIFICATION_ERR = 9;
        public const int QUOTA_EXCEEDED_ERR = 10;
        public const int TYPE_MISMATCH_ERR = 11;
        public const int PATH_EXISTS_ERR = 12;

        // File system options
        public const int TEMPORARY = 0;
        public const int PERSISTENT = 1;
        public const int RESOURCE = 2;
        public const int APPLICATION = 3;

        /// <summary>
        /// Temporary directory name
        /// </summary>
        //private readonly string TMP_DIRECTORY_NAME = "tmp";

        /// <summary>
        /// Represents error code for callback
        /// </summary>
        [DataContract]
        public class ErrorCode
        {
            /// <summary>
            /// Error code
            /// </summary>
            [DataMember(IsRequired = true, Name = "code")]
            public int Code { get; set; }

            /// <summary>
            /// Creates ErrorCode object
            /// </summary>
            public ErrorCode(int code)
            {
                this.Code = code;
            }
        }

        /// <summary>
        /// Represents File action options.
        /// </summary>
        [DataContract]
        public class FileOptions
        {
            /// <summary>
            /// File path
            /// </summary>
            /// 
            private string _fileName;
            [DataMember(Name = "fileName")]
            public string FilePath
            {
                get
                {
                    return this._fileName;
                }

                set
                {
                    int index = value.IndexOfAny(new char[] { '#', '?' });
                    this._fileName = index > -1 ? value.Substring(0, index) : value;
                }
            }

            /// <summary>
            /// Full entryPath
            /// </summary>
            [DataMember(Name = "fullPath")]
            public string FullPath { get; set; }

            /// <summary>
            /// Directory name
            /// </summary>
            [DataMember(Name = "dirName")]
            public string DirectoryName { get; set; }

            /// <summary>
            /// Path to create file/directory
            /// </summary>
            [DataMember(Name = "path")]
            public string Path { get; set; }

            /// <summary>
            /// The encoding to use to encode the file's content. Default is UTF8.
            /// </summary>
            [DataMember(Name = "encoding")]
            public string Encoding { get; set; }

            /// <summary>
            /// Uri to get file
            /// </summary>
            /// 
            private string _uri;
            [DataMember(Name = "uri")]
            public string Uri
            {
                get
                {
                    return this._uri;
                }

                set
                {
                    int index = value.IndexOfAny(new char[] { '#', '?' });
                    this._uri = index > -1 ? value.Substring(0, index) : value;
                }
            }

            /// <summary>
            /// Size to truncate file
            /// </summary>
            [DataMember(Name = "size")]
            public long Size { get; set; }

            /// <summary>
            /// Data to write in file
            /// </summary>
            [DataMember(Name = "data")]
            public string Data { get; set; }

            /// <summary>
            /// Position the writing starts with
            /// </summary>
            [DataMember(Name = "position")]
            public int Position { get; set; }

            /// <summary>
            /// Type of file system requested
            /// </summary>
            [DataMember(Name = "type")]
            public int FileSystemType { get; set; }

            /// <summary>
            /// New file/directory name
            /// </summary>
            [DataMember(Name = "newName")]
            public string NewName { get; set; }

            /// <summary>
            /// Destination directory to copy/move file/directory
            /// </summary>
            [DataMember(Name = "parent")]
            public string Parent { get; set; }

            /// <summary>
            /// Options for getFile/getDirectory methods
            /// </summary>
            [DataMember(Name = "options")]
            public CreatingOptions CreatingOpt { get; set; }

            /// <summary>
            /// Creates options object with default parameters
            /// </summary>
            public FileOptions()
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
                this.Encoding = "UTF-8";
                this.FilePath = "";
                this.FileSystemType = -1;
            }
        }

        [DataContract]
        public class CreatingOptions
        {
            /// <summary>
            /// Create file/directory if is doesn't exist
            /// </summary>
            [DataMember(Name = "create")]
            public bool Create { get; set; }

            /// <summary>
            /// Generate an exception if create=true and file/directory already exists
            /// </summary>
            [DataMember(Name = "exclusive")]
            public bool Exclusive { get; set; }
        }

        /// <summary>
        /// Stores image info
        /// </summary>
        [DataContract]
        public class FileMetadata
        {
            [DataMember(Name = "fileName")]
            public string FileName { get; set; }

            [DataMember(Name = "fullPath")]
            public string FullPath { get; set; }

            [DataMember(Name = "type")]
            public string Type { get; set; }

            [DataMember(Name = "lastModifiedDate")]
            public string LastModifiedDate { get; set; }

            [DataMember(Name = "size")]
            public long Size { get; set; }

            public FileMetadata(string filePath, string fileName, string type, string modifiedDate, long size)
            {
                
                if (string.IsNullOrEmpty(filePath))
                {
                    throw new FileNotFoundException("File doesn't exist");
                }
                //TODO get file size the other way if possible                
                    
                //this.Size = stream.Length;
                this.Size = size;
                this.FullPath = filePath;
                this.FileName = fileName;
                this.Type = type;
                this.LastModifiedDate = modifiedDate;
                
            }
        }

        /// <summary>
        /// Represents file or directory modification metadata
        /// </summary>
        [DataContract]
        public class ModificationMetadata
        {
            /// <summary>
            /// Modification time
            /// </summary>
            [DataMember]
            public string modificationTime { get; set; }
        }

        /// <summary>
        /// Represents file or directory entry
        /// </summary>
        [DataContract]
        public class FileEntry
        {

            /// <summary>
            /// File type
            /// </summary>
            [DataMember(Name = "isFile")]
            public bool IsFile { get; set; }

            /// <summary>
            /// Directory type
            /// </summary>
            [DataMember(Name = "isDirectory")]
            public bool IsDirectory { get; set; }

            /// <summary>
            /// File/directory name
            /// </summary>
            [DataMember(Name = "name")]
            public string Name { get; set; }

            /// <summary>
            /// Full path to file/directory
            /// </summary>
            [DataMember(Name = "fullPath")]
            public string FullPath { get; set; }

            public static FileEntry GetEntry(bool isFile,string filePath)
            {
                FileEntry entry = null;
                try
                {
                    entry = new FileEntry(isFile,filePath);

                }
                catch (Exception ex)
                {
                    Debug.WriteLine("Exception in GetEntry for filePath :: " + filePath + " " + ex.Message);
                }
                return entry;
            }

            /// <summary>
            /// Creates object and sets necessary properties
            /// </summary>
            /// <param name="filePath"></param>
            public FileEntry(bool isFile,string filePath)
            {
                if (string.IsNullOrEmpty(filePath))
                {
                    throw new ArgumentException();
                }

                if (filePath.Contains(" "))
                {
                    Debug.WriteLine("FilePath with spaces :: " + filePath);
                }

                if (isFile == true)
                {
                    this.Name = this.GetDirectoryName(filePath);
                    this.IsFile = true;
                    this.IsDirectory = false;
                    this.FullPath = filePath;
                    if (string.IsNullOrEmpty(Name))
                    {
                        this.Name = "";
                    }
                }
                else if (isFile == false)
                {
                    var  dir = Windows.Storage.StorageFolder.GetFolderFromPathAsync(filePath);
                    this.Name = this.GetDirectoryName(filePath);
                    this.IsFile = false;
                    this.IsDirectory = true;
                    this.FullPath = filePath;
                    if (string.IsNullOrEmpty(Name))
                    {
                        this.Name = "";
                    }
                }
                else
                {
                    throw new FileNotFoundException();
                }
            }

            /// <summary>
            /// Extracts directory name from path string
            /// Path should refer to a directory, for example \foo\ or /foo.
            /// </summary>
            /// <param name="path"></param>
            /// <returns></returns>
            private string GetDirectoryName(string path)
            {
                if (String.IsNullOrEmpty(path))
                {
                    return path;
                }

                string[] split = path.Split(new char[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries);
                if (split.Length < 1)
                {
                    return null;
                }
                else
                {
                    return split[split.Length - 1];
                }
            }
        }

        /// <summary>
        /// Represents info about requested file system
        /// </summary>
        [DataContract]
        public class FileSystemInfo
        {
            /// <summary>
            /// file system type
            /// </summary>
            [DataMember(Name = "name", IsRequired = true)]
            public string Name { get; set; }

            /// <summary>
            /// Root directory entry
            /// </summary>
            [DataMember(Name = "root", EmitDefaultValue = false)]
            public FileEntry Root { get; set; }

            /// <summary>
            /// Creates class instance
            /// </summary>
            /// <param name="name"></param>
            /// <param name="rootEntry"> Root directory</param>
            public FileSystemInfo(string name, FileEntry rootEntry = null)
            {
                Name = name;
                Root = rootEntry;
            }
        }

        /// <summary>
        /// File options
        /// </summary>
        //private FileOptions fileOptions;

        public void requestFileSystem(string options)
        {
            double[] optVals = JSON.JsonHelper.Deserialize<double[]>(options);

            double fileSystemType = optVals[0];
            double size = optVals[1];

            if (size > (10 * 1024 * 1024)) // 10 MB, compier will clean this up!
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, QUOTA_EXCEEDED_ERR));
                return;
            }

            try
            {
                if (fileSystemType == PERSISTENT)
                {
                    // TODO: this should be in it's own folder to prevent overwriting of the app assets, which are also in ISO
                    string persistentFolder = Windows.Storage.ApplicationData.Current.LocalFolder.Path;
                    DispatchCommandResult(new PluginResult(PluginResult.Status.OK, new FileSystemInfo("persistent", FileEntry.GetEntry(false,persistentFolder))));
                }
                else if (fileSystemType == TEMPORARY)
                {
                    string tempFolder = Windows.Storage.ApplicationData.Current.TemporaryFolder.Path;
                    DispatchCommandResult(new PluginResult(PluginResult.Status.OK, new FileSystemInfo("temporary", FileEntry.GetEntry(false,tempFolder))));
                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                }
            }
            catch (Exception ex)
            {
                if (this.HandleException(ex))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                }
            }
            
        }

        public async void resolveLocalFileSystemURI(string options)
        {
            string uri = getSingleStringOption(options).Split('?')[0];

            if (uri != null)
            {
                // a single '/' is valid, however, '/someDir' is not, but '/tmp//somedir' is valid
                if (uri.StartsWith("/") && uri.IndexOf("//") < 0 && uri != "/")
                {
                    Debug.WriteLine("Starts with / ::: " + uri);
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, ENCODING_ERR));
                    return;
                }
                try
                {
                    // support for a special path started with file:///
                    if (uri.Substring(0, 8) == "file:///")
                    {
                        string persistancePath = Windows.Storage.ApplicationData.Current.LocalFolder.Path;
                        string path = persistancePath + "\\" + uri.Substring(8);

                        try
                        {
                            StorageFile storagefile = await StorageFile.GetFileFromPathAsync(path);
                            if (storagefile != null)
                            {
                                FileEntry uriEntry = FileEntry.GetEntry(true, storagefile.Path);
                                if (uriEntry != null)
                                {
                                    DispatchCommandResult(new PluginResult(PluginResult.Status.OK, uriEntry));
                                }
                                else
                                {
                                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                                }
                            }
                            else
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                                return;
                            }
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                            return;
                        }
                    }
                    else
                    {
                        StorageFile storagefile = await StorageFile.GetFileFromPathAsync(uri);
                        if (storagefile != null)
                        {
                            FileEntry uriEntry = FileEntry.GetEntry(true, storagefile.Path);
                            if (uriEntry != null)
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, uriEntry));
                            }
                            else
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                            }
                        }
                        else
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    if (!this.HandleException(ex))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                    }
                }
            }
            else
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, ENCODING_ERR));
                return;
            }
        }

        public void moveTo(string options)
        {
            TransferTo(options, true);
        }

        public void copyTo(string options)
        {
            TransferTo(options, false);
        }

        /*
        *  copyTo:["fullPath","parent", "newName"],
        *  moveTo:["fullPath","parent", "newName"],
        */
        private async void TransferTo(string options, bool move)
        {
            // TODO: try/catch
            string[] optStrings = JSON.JsonHelper.Deserialize<string[]>(options);
            string fullPath = optStrings[0];
            string parent = optStrings[1];
            string newFileName = optStrings[2];
            bool isFile = Convert.ToBoolean(optStrings[3]);

            try
            {
                if ((parent == null) || (string.IsNullOrEmpty(parent)) || (string.IsNullOrEmpty(fullPath)))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                    return;
                }
                //if (move)
                //{
                if (isFile)
                {
                    if (fullPath == parent + "\\" + newFileName)
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                        return;
                    }
                    else
                    {
                        try
                        {
                            StorageFile storagefile = await StorageFile.GetFileFromPathAsync(fullPath);
                            if (storagefile != null)
                            {
                                StorageFolder storagefolder = await StorageFolder.GetFolderFromPathAsync(parent);
                                if (storagefolder != null)
                                {
                                    if (move)
                                    {
                                        await storagefile.MoveAsync(storagefolder, newFileName, NameCollisionOption.ReplaceExisting);

                                        FileEntry entry = FileEntry.GetEntry(isFile, storagefile.Path);
                                        if (entry != null)
                                        {
                                            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                                        }
                                        else
                                        {
                                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                                        }
                                    }
                                    else
                                    {
                                        await storagefile.CopyAsync(storagefolder, newFileName, NameCollisionOption.ReplaceExisting);

                                        FileEntry entry = FileEntry.GetEntry(isFile, storagefolder.Path + "\\" + newFileName);
                                        if (entry != null)
                                        {
                                            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                                        }
                                        else
                                        {
                                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                                        }
                                    }
                                }
                                else
                                {
                                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                                    return;
                                }
                            }
                            else
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                                return;
                            }
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                            return;
                        }
                    }

                }
                else if (!isFile)
                {
                    if (fullPath == parent)
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                        return;
                    }

                    else if (fullPath == parent + "\\" + newFileName)
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                        return;
                    }
                    else
                    {
                        try
                        {
                            StorageFolder originalFolder = await StorageFolder.GetFolderFromPathAsync(fullPath);
                            StorageFolder storageFolder = await StorageFolder.GetFolderFromPathAsync(parent);
                            StorageFolder newStorageFolder = await storageFolder.CreateFolderAsync(newFileName, CreationCollisionOption.OpenIfExists);
                            IReadOnlyList<StorageFile> fileList = await newStorageFolder.CreateFileQuery().GetFilesAsync();
                            IReadOnlyList<StorageFolder> folderList = await newStorageFolder.CreateFolderQuery().GetFoldersAsync();

                            if (fileList.Count != 0 || folderList.Count != 0)
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                                return;
                            }
                            else
                            {
                                await MoveFile(fullPath, newStorageFolder.Path, move);

                                if (move)
                                {
                                    await originalFolder.DeleteAsync();
                                }

                                FileEntry entry = FileEntry.GetEntry(isFile, newStorageFolder.Path);
                                if (entry != null)
                                {
                                    DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                                }
                                else
                                {
                                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                                }
                            }
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                            return;
                        }
                    }
                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                    return;
                }
            }
            catch (Exception ex)
            {
                if (!this.HandleException(ex))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                }
            }
        }

        private async Task MoveFile(string fullPath, string parentPath, bool move)
        {
            try
            {
                StorageFolder storageFolder = await StorageFolder.GetFolderFromPathAsync(fullPath);
                IReadOnlyList<StorageFile> filelist = await storageFolder.CreateFileQuery().GetFilesAsync();
                StorageFolder dstStorageFolder = await StorageFolder.GetFolderFromPathAsync(parentPath);
                if (filelist.Count > 0)
                {
                    foreach (StorageFile file in filelist)
                    {
                        if (move)
                        {
                            await file.MoveAsync(dstStorageFolder, file.Name, NameCollisionOption.ReplaceExisting);
                        }
                        else if (!move)
                        {
                            await file.CopyAsync(dstStorageFolder, file.Name, NameCollisionOption.ReplaceExisting);
                        }
                        else
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                            return;
                        }
                    }
                }

                IReadOnlyList<StorageFolder> folderlist = await storageFolder.CreateFolderQuery().GetFoldersAsync();
                if (folderlist.Count > 0)
                {
                    StorageFolder storageFolderTarget = await StorageFolder.GetFolderFromPathAsync(parentPath);
                    foreach (StorageFolder folder in folderlist)
                    {
                        StorageFolder targetfolder = await storageFolderTarget.CreateFolderAsync(folder.Name, CreationCollisionOption.ReplaceExisting);
                        await MoveFile(folder.Path, targetfolder.Path, move);
                    }
                }
            }
            catch (Exception)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                return;
            }
        }

        public void getFile(string options)
        {
            GetFileOrDirectory(options, false);
        }

        public void getDirectory(string options)
        {
            GetFileOrDirectory(options, true);
        }

        public async void truncate(string options)
        {
            // TODO: try/catch
            string[] optStrings = JSON.JsonHelper.Deserialize<string[]>(options);

            string filePath = optStrings[0];
            int size = int.Parse(optStrings[1]);

            try
            {
                long streamLength = 0;

                StorageFile storagefile = await Windows.Storage.StorageFile.GetFileFromPathAsync(filePath);
                if (storagefile != null)
                {
                    var tasks = new List<Task<BasicProperties>>();
                    tasks.Add(storagefile.GetBasicPropertiesAsync().AsTask());
                    var result = await Task.WhenAll(tasks);
                    foreach (var prop in result)
                    {
                        streamLength = (long)prop.Size;
                    }

                    if (size >= streamLength)
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK, streamLength));
                        return;
                    }
                    else if (size >= 0)
                    {
                        string fileContent = await Windows.Storage.FileIO.ReadTextAsync(storagefile, Windows.Storage.Streams.UnicodeEncoding.Utf8);
                        fileContent = fileContent.Substring(0,size);
                        string[] split = filePath.Split(new char[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries);
                        int len = split.Length;
                        string name = split[len -1];
                        string parentPath = filePath.Substring(0, filePath.Length - split[len - 1].Length -1);
                        try
                        {
                            await storagefile.DeleteAsync();
                            StorageFolder storagefolder = await Windows.Storage.StorageFolder.GetFolderFromPathAsync(parentPath);
                            if (storagefolder != null)
                            {
                                StorageFile newStoragefile = await storagefolder.CreateFileAsync(name, CreationCollisionOption.ReplaceExisting);
                                await Windows.Storage.FileIO.WriteTextAsync(newStoragefile, fileContent);
                                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, fileContent.Length));
                            }
                            else
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_READABLE_ERR));
                            }
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                            return;
                        }
                    }
                    else
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                        return;
                    }
                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                    return;
                }
                

               
            }
            catch (Exception ex)
            {
                if (!this.HandleException(ex))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_READABLE_ERR));
                }
            }
        }

        public async void write(string options)
        {
            // TODO: try/catch
            string[] optStrings = JSON.JsonHelper.Deserialize<string[]>(options);

            string filePath = optStrings[0];
            string data = optStrings[1];
            int position = int.Parse(optStrings[2]);

            try
            {
                if (string.IsNullOrEmpty(data))
                {
                    Debug.WriteLine("Expected some data to be send in the write command to {0}", filePath);
                    DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
                    return;
                }

                StorageFile storagefile = await Windows.Storage.StorageFile.GetFileFromPathAsync(filePath);
                if (storagefile != null)
                {
                    try
                    {
                        await Windows.Storage.FileIO.WriteTextAsync(storagefile, data, Windows.Storage.Streams.UnicodeEncoding.Utf8);
                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK, data.Length));
                    }
                    catch (Exception)
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                        return;
                    }
                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                    return;
                }
            }
            catch (Exception ex)
            {
                if (!this.HandleException(ex))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_READABLE_ERR));
                }
            }
        }

        /// <summary>
        /// Look up metadata about this entry.
        /// </summary>
        /// <param name="options">filePath to entry</param>   
        public async void getMetadata(string options)
        {
            string[] args = JSON.JsonHelper.Deserialize<string[]>(options);
            string filePath = args[0];
            bool isFile = Convert.ToBoolean(args[1]);
            string modifiedDate;
            if (filePath != null)
            {
                try
                {
                    if (isFile)
                    {
                        StorageFile storagefile = await StorageFile.GetFileFromPathAsync(filePath);
                        if (storagefile != null)
                        {
                            var tasks = new List<Task<BasicProperties>>();
                            tasks.Add(storagefile.GetBasicPropertiesAsync().AsTask());
                            var result = await Task.WhenAll(tasks);
                            foreach (var prop in result)
                            {
                                modifiedDate = prop.DateModified.ToString();
                                string[] split = modifiedDate.Split('+');
                                modifiedDate = split[0];

                                DispatchCommandResult(new PluginResult(PluginResult.Status.OK,
                                new ModificationMetadata() { modificationTime = modifiedDate }));
                            }
                        }
                        else
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                        }
                    }
                    else if (!isFile)
                    {
                        StorageFolder storagefolder = await StorageFolder.GetFolderFromPathAsync(filePath);
                        if (storagefolder != null)
                        {
                            var tasks = new List<Task<BasicProperties>>();
                            tasks.Add(storagefolder.GetBasicPropertiesAsync().AsTask());
                            var result = await Task.WhenAll(tasks);
                            foreach (var prop in result)
                            {
                                modifiedDate = prop.DateModified.ToString();
                                string[] split = modifiedDate.Split('+');
                                modifiedDate = split[0];

                                DispatchCommandResult(new PluginResult(PluginResult.Status.OK,
                                new ModificationMetadata() { modificationTime = modifiedDate }));
                            }
                        }
                        else
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                        }
                    }
                    else
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                    }


                }

                catch (Exception ex)
                {
                    if (!this.HandleException(ex))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_READABLE_ERR));
                    }
                }
            }
            else
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
            }

        }

        /// <summary>
        /// Returns a File that represents the current state of the file that this FileEntry represents.
        /// </summary>
        /// <param name="filePath">filePath to entry</param>
        /// <returns></returns>
        public async void getFileMetadata(string options)
        {
            string filePath = getSingleStringOption(options);
            if (filePath != null)
            {
                try
                {
                    StorageFile storagefile = await StorageFile.GetFileFromPathAsync(filePath);

                    long size = 0;
                    string modifiedDate = "";
                    var tasks = new List<Task<BasicProperties>>();
                    tasks.Add(storagefile.GetBasicPropertiesAsync().AsTask());
                    var result = await Task.WhenAll(tasks);
                    foreach (var prop in result)
                    {
                        size = (long)prop.Size;
                        modifiedDate = prop.DateModified.ToString();
                    }

                    FileMetadata metaData = new FileMetadata(storagefile.Path, storagefile.Name, storagefile.ContentType, modifiedDate, size);
                    DispatchCommandResult(new PluginResult(PluginResult.Status.OK, metaData));
                }

                catch (Exception ex)
                {
                    if (!this.HandleException(ex))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_READABLE_ERR));
                    }
                }
            }
            else
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_READABLE_ERR)); 
            }
        }

        public async void getParent(string options)
        {
            string filePath = getSingleStringOption(options);
            if (filePath != null)
            {
                try
                {
                    if (string.IsNullOrEmpty(filePath))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
                        return;
                    }

                    string storageFolderPer = Windows.Storage.ApplicationData.Current.LocalFolder.Path;
                    string storageFolderTemp = Windows.Storage.ApplicationData.Current.TemporaryFolder.Path;

                    if (filePath == storageFolderPer)
                    {
                        FileEntry entry = FileEntry.GetEntry(false, filePath);
                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                        return;
                    }
                    else if (filePath == storageFolderTemp)
                    {
                        FileEntry entry = FileEntry.GetEntry(false, filePath);
                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                        return;
                    }
                    else
                    {
                        try
                        {
                            string[] split = filePath.Split(new char[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries);
                            int len = split.Length;
                            string parentPath = filePath.Substring(0, filePath.Length - split[len - 1].Length - 1);

                            StorageFolder storagefolder = await StorageFolder.GetFolderFromPathAsync(parentPath);
                            if (storagefolder != null)
                            {
                                FileEntry entry = FileEntry.GetEntry(false, parentPath);
                                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                            }

                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                        }
                    }
                }
                catch (Exception ex)
                {
                    if (!this.HandleException(ex))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                    }
                }
            }
            else
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
            }
        }

        public async void readAsDataURL(string options)
        {
            // exception+PluginResult are handled by getSingleStringOptions 
            string filePath = getSingleStringOption(options);
            if (filePath != null)
            {
                try
                {
                    string base64URL = null;

                    StorageFile storagefile = await Windows.Storage.StorageFile.GetFileFromPathAsync(filePath);
                    if (storagefile != null)
                    {
                        IBuffer buffer = await Windows.Storage.FileIO.ReadBufferAsync(storagefile);
                        string strBase64 = Windows.Security.Cryptography.CryptographicBuffer.EncodeToBase64String(buffer);
                        
                        if (strBase64.Substring(0, 4) == "77u/")
                        {
                            strBase64 = strBase64.Substring(4);
                        }

                        string filetype = storagefile.FileType;
                        string mimeType = MimeTypeMapper.GetMimeType(filetype);

                        base64URL = "data:" + mimeType + ";base64," + strBase64;

                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK, base64URL));
                    }
                    else
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                        return;
                    }

                    
                }
                catch (Exception ex)
                {
                    if (!this.HandleException(ex))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_READABLE_ERR));
                    }
                }
            }
        }

        public async void readAsText(string options)
        {
            // TODO: try/catch
            string[] optStrings = JSON.JsonHelper.Deserialize<string[]>(options);
            string filePath = optStrings[0];
            string encStr = optStrings[1];

            try
            {
                string text;

                StorageFile storagefile = await Windows.Storage.StorageFile.GetFileFromPathAsync(filePath);
                if (storagefile != null)
                {
                    var value = Windows.Storage.Streams.UnicodeEncoding.Utf8;
                    if (encStr == "Utf16LE" || encStr == "utf16LE")
                    {
                        value = Windows.Storage.Streams.UnicodeEncoding.Utf16LE;
                    } 
                    else if (encStr == "Utf16BE" || encStr == "utf16BE") 
                    {
                        value = Windows.Storage.Streams.UnicodeEncoding.Utf16BE;
                    }

                    text = await Windows.Storage.FileIO.ReadTextAsync(storagefile, value);

                    DispatchCommandResult(new PluginResult(PluginResult.Status.OK, text));
                }
                else
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                    return;
                }
                
                
            }
            catch (Exception ex)
            {
                if (!this.HandleException(ex))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_READABLE_ERR));
                }
            }
        }

        public async void remove(string options)
        {
            string[] args = JSON.JsonHelper.Deserialize<string[]>(options);
            string filePath = args[0];
            bool isFile = Convert.ToBoolean(args[1]);
            
            if (filePath != null)
            {
                try
                {
                    if (isFile)
                    {
                        try
                        {
                            StorageFile storagefile = await Windows.Storage.StorageFile.GetFileFromPathAsync(filePath);
                            if (storagefile != null)
                            {
                                await storagefile.DeleteAsync();
                            }
                            DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                            return;
                        }
                    }
                    else
                    {
                        try
                        {
                            StorageFolder storagefolder = await Windows.Storage.StorageFolder.GetFolderFromPathAsync(filePath);

                            //FileSystem root can't be removed!
                            string storageFolderPer = Windows.Storage.ApplicationData.Current.LocalFolder.Path;
                            string storageFolderTem = Windows.Storage.ApplicationData.Current.TemporaryFolder.Path;
                            if (filePath == storageFolderPer || filePath == storageFolderTem)
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                                return;
                            }

                            IReadOnlyList<StorageFile> fileList = await storagefolder.CreateFileQuery().GetFilesAsync();
                            if(fileList.Count == 0)
                            {
                                IReadOnlyList<StorageFolder> folderList = await storagefolder.CreateFolderQuery().GetFoldersAsync();
                                if (folderList.Count == 0)
                                {
                                    try
                                    {
                                        await storagefolder.DeleteAsync();
                                        DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
                                    }
                                    catch(Exception)
                                    {
                                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                                        return;
                                    }
                                }
                                else
                                {
                                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                                    return;
                                }
                            }
                            else
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                                return;
                            }
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_MODIFICATION_ERR));
                            return;
                        }

                    }
                }
                catch (Exception ex)
                {
                    if (!this.HandleException(ex))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                    }
                }
            }
        }

        public void removeRecursively(string options)
        {
            string filePath = getSingleStringOption(options);
            if (filePath != null)
            {
                if (string.IsNullOrEmpty(filePath))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
                }
                else
                {
                    removeDirRecursively(filePath);
                    DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
                }
            }
        }

        public async void readEntries(string options)
        {
            string filePath = getSingleStringOption(options);
            if (filePath != null)
            {
                try
                {
                    if (string.IsNullOrEmpty(filePath))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
                        return;
                    }
                    else
                    {
                        try
                        {
                            StorageFolder storagefolder = await StorageFolder.GetFolderFromPathAsync(filePath);
                            if (storagefolder != null)
                            {
                                List<FileEntry> entries = new List<FileEntry>();

                                IReadOnlyList<StorageFile> filelist = await storagefolder.CreateFileQuery().GetFilesAsync();
                                if (filelist.Count > 0)
                                {
                                    foreach (StorageFile file in filelist)
                                    {
                                        FileEntry entry = FileEntry.GetEntry(true, file.Path);
                                        entries.Add(entry);
                                    }
                                }

                                IReadOnlyList<StorageFolder> folderlist = await storagefolder.CreateFolderQuery().GetFoldersAsync();
                                if (folderlist.Count > 0)
                                {
                                    foreach (StorageFolder folder in folderlist)
                                    {
                                        FileEntry entry = FileEntry.GetEntry(false, folder.Path);
                                        entries.Add(entry);
                                    }
                                }

                                DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entries));
                            }
                            else
                            {
                                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                                return;
                            }

                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                        }
                    }
                    
                }
                catch (Exception ex)
                {
                    if (!this.HandleException(ex))
                    {
                        DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                    }
                }
            }
        }

        private async void GetFileOrDirectory(string options, bool getDirectory)
        {
            FileOptions fOptions = new FileOptions();
            try
            {
                string[] args = JSON.JsonHelper.Deserialize<string[]>(options);

                fOptions.FullPath = args[0];
                fOptions.Path = args[1];
                fOptions.CreatingOpt = JSON.JsonHelper.Deserialize<CreatingOptions>(args[2]);
            }
            catch (Exception)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
                return;
            }

            try
            {
                if ((string.IsNullOrEmpty(fOptions.Path)) || (string.IsNullOrEmpty(fOptions.FullPath)))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                    return;
                }

                string path;

                if (fOptions.Path.Split(':').Length > 2)
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, ENCODING_ERR));
                    return;
                }

                path = fOptions.FullPath + "\\" + fOptions.Path;

                bool create = (fOptions.CreatingOpt == null) ? false : fOptions.CreatingOpt.Create;
                bool exclusive = (fOptions.CreatingOpt == null) ? false : fOptions.CreatingOpt.Exclusive;

                try
                {
                    StorageFolder storagefolder = await Windows.Storage.StorageFolder.GetFolderFromPathAsync(fOptions.FullPath);
                    if (create == true && exclusive == true)
                    {
                        try
                        {
                            if (getDirectory)
                            {
                                await storagefolder.CreateFolderAsync(fOptions.Path, CreationCollisionOption.FailIfExists);
                            }
                            else
                            {
                                await storagefolder.CreateFileAsync(fOptions.Path, CreationCollisionOption.FailIfExists);
                            }
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, PATH_EXISTS_ERR));
                            return;
                        }

                        FileEntry entry = FileEntry.GetEntry(!getDirectory, path);
                        if (entry != null)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                        }
                    }

                    else if (create == true && exclusive == false)
                    {
                        try
                        {
                            if (getDirectory)
                            {
                                await storagefolder.CreateFolderAsync(fOptions.Path, CreationCollisionOption.OpenIfExists);
                            }
                            else
                            {
                                await storagefolder.CreateFileAsync(fOptions.Path, CreationCollisionOption.OpenIfExists);
                            }
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                            return;
                        }

                        FileEntry entry = FileEntry.GetEntry(!getDirectory, path);
                        if (entry != null)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                        }
                    }

                    else if (create == false)
                    {
                        try
                        {
                            if (getDirectory)
                            {
                                await storagefolder.GetFolderAsync(fOptions.Path);
                            }
                            else
                            {
                                await storagefolder.GetFileAsync(fOptions.Path);
                            }
                        }
                        catch (Exception)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                            return;
                        }

                        FileEntry entry = FileEntry.GetEntry(!getDirectory, path);
                        if (entry != null)
                        {
                            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, entry));
                        }
                    }
                }
                catch (Exception)
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                }

            }
            catch (Exception ex)
            {
                if (!this.HandleException(ex))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                }
            }
        }

        private string getSingleStringOption(string options)
        {
            string result = null;
            try
            {
                result = JSON.JsonHelper.Deserialize<string[]>(options)[0];
            }
            catch (Exception)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
            }
            return result;
        }

        private async void removeDirRecursively(string fullPath)
        {
            try
            {
                StorageFolder storagefolder = await Windows.Storage.StorageFolder.GetFolderFromPathAsync(fullPath);
                if (storagefolder != null)
                {
                    await storagefolder.DeleteAsync();
                }
            }
            catch (Exception ex)
            {
                if (!this.HandleException(ex))
                {
                    DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NO_MODIFICATION_ALLOWED_ERR));
                }
            }
        }

        private bool HandleException(Exception ex)
        {
            bool handled = false;
            if (ex is SecurityException)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, SECURITY_ERR));
                handled = true;
            }
            else if (ex is FileNotFoundException)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, NOT_FOUND_ERR));
                handled = true;
            }
            else if (ex is ArgumentException)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, ENCODING_ERR));
                handled = true;
            }
            return handled;
        }
    }
}
