﻿/*  
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
using System.Threading;
using System.Threading.Tasks;
using Windows.UI.Xaml.Controls;
using System.Diagnostics;
using Windows8PhonegapWinRT.Commands;
using Windows.System.Threading;
using Windows.UI.Core;


namespace Windows8PhonegapWinRT
{
    /// <summary>
    /// Implements logic to execute native command and return result back.
    /// All commands are executed asynchronous.
    /// </summary>
    public class NativeExecution
    {
        /// <summary>
        /// Reference to web part where application is hosted
        /// </summary>
        /// 
        private readonly WebView webView;

        /// <summary>
        /// Creates new instance of a NativeExecution class. 
        /// </summary>
        /// <param name="browser">Reference to web part where application is hosted</param>
        public NativeExecution(ref WebView view)
        {
            if (view == null)
            {
                throw new ArgumentNullException("view");
            }
            this.webView = view;
        }

        /// <summary>
        /// Executes command and returns result back.
        /// </summary>
        /// <param name="commandCallParams">Command to execute</param>
        public void ProcessCommand(CordovaCommandCall commandCallParams)
        {

            if (commandCallParams == null)
            {
                throw new ArgumentNullException("commandCallParams");
            }

            try
            {
                BaseCommand bc = CommandFactory.CreateByServiceName(commandCallParams.Service);

                if (bc == null)
                {
                    this.OnCommandResult(commandCallParams.CallbackId, new PluginResult(PluginResult.Status.CLASS_NOT_FOUND_EXCEPTION));
                    return;
                }

                EventHandler<PluginResult> OnCommandResultHandler = delegate(object o, PluginResult res)
                {
                    Debug.WriteLine("I am in onCommandResultHandler for calling onCommandResult Method");
                    //this.OnCommandResult(commandCallParams.CallbackId, res);
                    if (res.CallbackId == null || res.CallbackId == commandCallParams.CallbackId)
                    {
                        this.OnCommandResult(commandCallParams.CallbackId, res);
                        if (!res.KeepCallback)
                        {
                            bc.RemoveResultHandler(commandCallParams.CallbackId);
                        }
                    }
                };

                //bc.OnCommandResult += OnCommandResultHandler;
                bc.AddResultHandler(commandCallParams.CallbackId, OnCommandResultHandler);

                EventHandler<ScriptCallback> OnCustomScriptHandler = delegate(object o, ScriptCallback script)
                {
                    this.InvokeScriptCallback(script);
                };


                bc.OnCustomScript += OnCustomScriptHandler;

                try
                {
                    bc.InvokeMethodNamed(commandCallParams.CallbackId, commandCallParams.Action, commandCallParams.Args);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("ERROR: Exception in ProcessCommand :: " + ex.Message);
                    bc.OnCommandResult -= OnCommandResultHandler;
                    bc.OnCustomScript -= OnCustomScriptHandler;

                    Debug.WriteLine("ERROR: failed to InvokeMethodNamed :: " + commandCallParams.Action + " on Object :: " + commandCallParams.Service);

                    this.OnCommandResult(commandCallParams.CallbackId, new PluginResult(PluginResult.Status.INVALID_ACTION));

                    return;
                }

            }
            catch (Exception ex)
            {
                // ERROR
                Debug.WriteLine(String.Format("ERROR: Unable to execute command :: {0}:{1}:{3} ",
                    commandCallParams.Service, commandCallParams.Action, ex.Message));

                this.OnCommandResult(commandCallParams.CallbackId, new PluginResult(PluginResult.Status.ERROR));
                return;
            }
        }

        /// <summary>
        /// Handles command execution result.
        /// </summary>
        /// <param name="callbackId">Command callback identifier on client side</param>
        /// <param name="result">Execution result</param>
        private void OnCommandResult(string callbackId, PluginResult result)
        {
            #region  args checking

            if (result == null)
            {
                Debug.WriteLine("ERROR: OnCommandResult missing result argument");
                return;
            }

            if (String.IsNullOrEmpty(callbackId))
            {
                Debug.WriteLine("ERROR: OnCommandResult missing callbackId argument");
                return;
            }

            if (!String.IsNullOrEmpty(result.CallbackId) && callbackId != result.CallbackId)
            {
                Debug.WriteLine("Multiple Overlapping Results :: " + result.CallbackId + " :: " + callbackId);
                return;
            }

            #endregion

            string jsonResult = result.ToJSONString();

            string callback;
            string args = string.Format("('{0}',{1});", callbackId, jsonResult);

            if (result.Result == PluginResult.Status.NO_RESULT ||
               result.Result == PluginResult.Status.OK)
            {
                callback = @"(function(callbackId,args) {
                try { args.message = JSON.parse(args.message); } catch (ex) { }
                cordova.callbackSuccess(callbackId,args);
                })" + args;
            }
            else
            {
                callback = @"(function(callbackId,args) {
                try { args.message = JSON.parse(args.message); } catch (ex) { }
                cordova.callbackError(callbackId,args);
                })" + args;
            }
            this.InvokeScriptCallback(new ScriptCallback("eval", new string[] { callback }));

        }

        /// <summary>
        /// Executes client java script
        /// </summary>
        /// <param name="script">Script to execute on client side</param>
        private async void InvokeScriptCallback(ScriptCallback script)
        {
            if (script == null)
            {
                throw new ArgumentNullException("script");
            }

            if (String.IsNullOrEmpty(script.ScriptName))
            {
                throw new ArgumentNullException("ScriptName");
            }

            //Debug.WriteLine("INFO:: About to invoke ::" + script.ScriptName + " with args ::" + script.Args[0]);
            await this.webView.Dispatcher.RunAsync(CoreDispatcherPriority.Normal, new Windows.UI.Core.DispatchedHandler(async () =>
            {

                try
                {
                    //Debug.WriteLine("INFO:: InvokingScript::" + script.ScriptName + " with args ::" + script.Args[0]);
                    this.webView.InvokeScript(script.ScriptName, script.Args);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("ERROR: Exception in InvokeScriptCallback :: " + ex.Message);
                }

            }));
        }
    }
}
