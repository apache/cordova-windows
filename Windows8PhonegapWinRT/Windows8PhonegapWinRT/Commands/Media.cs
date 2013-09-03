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
using Windows.UI.Xaml.Controls;

namespace Windows8PhonegapWinRT.Commands
{
   public class Media : BaseCommand
    {

        /// <summary>
        /// Audio player objects
        /// </summary>
        private static Dictionary<string, AudioPlayer> players = new Dictionary<string, AudioPlayer>();

        /// <summary>
        /// Represents Media action options.
        /// </summary>
        [DataContract]
        public class MediaOptions
        {
            /// <summary>
            /// Audio id
            /// </summary>
            [DataMember(Name = "id", IsRequired = true)]
            public string Id { get; set; }

            /// <summary>
            /// Path to audio file
            /// </summary>
            [DataMember(Name = "src")]
            public string Src { get; set; }

            /// <summary>
            /// New track position
            /// </summary>
            [DataMember(Name = "milliseconds")]
            public int Milliseconds { get; set; }
        }

        /// <summary>
        /// Starts or resume playing audio file 
        /// </summary>
       public void startPlayingAudio(string options)
       {
           try
           {
               MediaOptions mediaOptions;
               try
               {
                   string[] optionsString = JSON.JsonHelper.Deserialize<string[]>(options);
                   mediaOptions = new MediaOptions();
                   mediaOptions.Id = optionsString[0];
                   mediaOptions.Src = optionsString[1];
                   if (optionsString.Length > 2 && optionsString[2] != null)
                   {
                       mediaOptions.Milliseconds = int.Parse(optionsString[2]);
                   }
               }
               catch (Exception)
               {
                   DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
                   return;
               }

               AudioPlayer audio;

               if (!Media.players.ContainsKey(mediaOptions.Id))
               {
                   
                   audio = new AudioPlayer(this, mediaOptions.Id);
                   Media.players.Add(mediaOptions.Id, audio);
               }
               else
               {     
                   audio = Media.players[mediaOptions.Id];
               }
          
                   try
                   {
                       audio.startPlaying(mediaOptions.Src);
                       DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
                   }
                   catch (Exception e)
                   {
                       DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
                   }           
           }
           catch (Exception e)
           {
               DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
           }
       }

       // Called when you create a new Media('blah') object in JS.
       public void create(string options)
       {         
           try
           {
               MediaOptions mediaOptions;
               try
               {
                   string[] optionsString = JSON.JsonHelper.Deserialize<string[]>(options);
                   mediaOptions = new MediaOptions();
                   mediaOptions.Id = optionsString[0];
                   mediaOptions.Src = optionsString[1];
               }
               catch (Exception)
               {
                   DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION, "Error parsing options into create method"));
                   return;
               }

               DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
           }
           catch (Exception e)
           {
               DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
           }
       }


       /// <summary>
       /// Gets current position of playback
       /// </summary>
       public void getCurrentPositionAudio(string options)
       {
           try
           {
               string mediaId = JSON.JsonHelper.Deserialize<string[]>(options)[0];
         
                   try
                   {
                       if (Media.players.ContainsKey(mediaId))
                       {
                           AudioPlayer audio = Media.players[mediaId];
                           DispatchCommandResult(new PluginResult(PluginResult.Status.OK, audio.getCurrentPosition()));
                       }
                       else
                       {
                           DispatchCommandResult(new PluginResult(PluginResult.Status.OK, -1));
                       }
                   }
                   catch (Exception e)
                   {
                       DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
                   }
           }
           catch (Exception)
           {
               DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
               return;
           }
       }


       /// <summary>
       /// Pauses playing 
       /// </summary>
       public void pausePlayingAudio(string options)
       {

           try
           {
               string mediaId = JSON.JsonHelper.Deserialize<string[]>(options)[0];

                   try
                   {
                       if (Media.players.ContainsKey(mediaId))
                       {
                           AudioPlayer audio = Media.players[mediaId];
                           audio.pausePlaying();
                       }
                       else
                       {
                        //   Debug.WriteLine("ERROR: pausePlayingAudio could not find mediaPlayer for " + mediaId);
                       }
                       DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
                   }
                   catch (Exception e)
                   {
                       DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
                   }
   
           }
           catch (Exception)
           {
               DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
           }

       }


       /// <summary>
       /// Stops playing the audio file
       /// </summary>
       public void stopPlayingAudio(String options)
       {
           try
           {
               string mediaId = JSON.JsonHelper.Deserialize<string[]>(options)[0];
          
                   try
                   {
                       if (Media.players.ContainsKey(mediaId))
                       {
                           AudioPlayer audio = Media.players[mediaId];
                           audio.stopPlaying();
                       }
                       else
                       {
               //            Debug.WriteLine("stopPlaying could not find mediaPlayer for " + mediaId);
                       }

                       DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
                   }
                   catch (Exception e)
                   {
                       DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
                   }
           }
           catch (Exception)
           {
               DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
           }
       }



       /// <summary>
       /// Seeks to a location
       /// </summary>
       public void seekToAudio(string options)
       {
           try
           {
               MediaOptions mediaOptions;
               try
               {
                   string[] optionsString = JSON.JsonHelper.Deserialize<string[]>(options);
                   mediaOptions = new MediaOptions();
                   mediaOptions.Id = optionsString[0];
                   if (optionsString.Length > 1 && optionsString[1] != null)
                   {
                       mediaOptions.Milliseconds = int.Parse(optionsString[1]);
                   }
               }
               catch (Exception)
               {
                   DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
                   return;
               }                       
                   try
                   {
                       if (Media.players.ContainsKey(mediaOptions.Id))
                       {
                           AudioPlayer audio = Media.players[mediaOptions.Id];
                           audio.seekToPlaying(mediaOptions.Milliseconds);
                       }
                       else
                       {
                  //         Debug.WriteLine("ERROR: seekToAudio could not find mediaPlayer for " + mediaOptions.Id);
                       }

                       DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
                   }
                   catch (Exception e)
                   {
                       DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
                   }
              }
           catch (Exception e)
           {
               DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
           }
       }


       /// <summary>
       /// Starts recording and save the specified file 
       /// </summary>
       public void startRecordingAudio(string options)
       {
           try
           {
               MediaOptions mediaOptions;
               try
               {
                   string[] optionsString = JSON.JsonHelper.Deserialize<string[]>(options);
                   mediaOptions = new MediaOptions();
                   mediaOptions.Id = optionsString[0];
                   mediaOptions.Src = optionsString[1];
               }
               catch (Exception)
               {
                   DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
                   return;
               }

               if (mediaOptions != null)
               {
                       try
                       {
                       if (!Media.players.ContainsKey(mediaOptions.Id))
                           {
                               AudioPlayer audio = new AudioPlayer(this, mediaOptions.Id);
                               Media.players.Add(mediaOptions.Id, audio);
                               audio.startRecording(mediaOptions.Src);
                           }
                           DispatchCommandResult(new PluginResult(PluginResult.Status.OK));
                       }
                       catch (Exception e)
                       {
                           DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
                       }
               }
               else
               {
                   DispatchCommandResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
               }
           }
           catch (Exception e)
           {
               DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, e.Message));
           }
       }
     

    }
}
