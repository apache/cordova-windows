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
using Windows.ApplicationModel.Contacts;

namespace Windows8PhonegapWinRT.Commands
{
    [DataContract]
    public class SearchOptions
    {
        [DataMember]
        public string filter { get; set; }
        [DataMember]
        public bool multiple { get; set; }
    }

    [DataContract]
    public class ContactSearchParams
    {
        [DataMember]
        public string[] fields { get; set; }
        [DataMember]
        public SearchOptions options { get; set; }
    }

    public class Contacts : BaseCommand
    {
        public const int UNKNOWN_ERROR = 0;
        public const int INVALID_ARGUMENT_ERROR = 1;
        public const int TIMEOUT_ERROR = 2;
        public const int PENDING_OPERATION_ERROR = 3;
        public const int IO_ERROR = 4;
        public const int NOT_SUPPORTED_ERROR = 5;
        public const int PERMISSION_DENIED_ERROR = 20;
        public const int SYNTAX_ERR = 8;

        public Contacts()
        {

        }

        public async void search(string searchCriteria)
        {
            string[] args = JSON.JsonHelper.Deserialize<string[]>(searchCriteria);

            ContactSearchParams searchParams = new ContactSearchParams();
            try
            {
                searchParams.fields = JSON.JsonHelper.Deserialize<string[]>(args[0]);
                searchParams.options = JSON.JsonHelper.Deserialize<SearchOptions>(args[1]);
            }
            catch (Exception)
            {
                DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, INVALID_ARGUMENT_ERROR));
                return;
            }

            if (searchParams.options == null)
            {
                searchParams.options = new SearchOptions();
                searchParams.options.filter = "";
                searchParams.options.multiple = true;
            }

            if (searchParams.options.multiple == true)
            {
                var contactPicker = new Windows.ApplicationModel.Contacts.ContactPicker();
                contactPicker.CommitButtonText = "Select";
                contactPicker.SelectionMode = Windows.ApplicationModel.Contacts.ContactSelectionMode.Contacts;


                IReadOnlyList<ContactInformation> contacts = await contactPicker.PickMultipleContactsAsync();
                string strResult = "";
                foreach (ContactInformation contact in contacts)
                {
                    strResult += FormatJSONContact(contact, null) + ",";
                }
                PluginResult result = new PluginResult(PluginResult.Status.OK);
                result.Message = "[" + strResult.TrimEnd(',') + "]";
                DispatchCommandResult(result);
            }
            else
            {
                var contactPicker = new Windows.ApplicationModel.Contacts.ContactPicker();
                contactPicker.CommitButtonText = "Select";
                contactPicker.SelectionMode = Windows.ApplicationModel.Contacts.ContactSelectionMode.Contacts;


                ContactInformation contact = await contactPicker.PickSingleContactAsync();
                string strResult = "";

                if (contact != null)
                {
                    strResult += FormatJSONContact(contact, null) + ",";
                }
               
                PluginResult result = new PluginResult(PluginResult.Status.OK);
                result.Message = "[" + strResult.TrimEnd(',') + "]";
                DispatchCommandResult(result);
            }
        }

        private string FormatJSONContact(ContactInformation con, string[] fields)
        {
            string contactFormatStr = "\"id\":\"{0}\"," +
                                      "\"displayName\":\"{1}\"," +
                                      "\"phoneNumbers\":[{2}]," +
                                      "\"emails\":[{3}]," +
                                      "\"addresses\":[{4}]";


            string jsonContact = String.Format(contactFormatStr,
                                               con.GetHashCode(),
                                               con.Name,
                                               FormatJSONPhoneNumbers(con),
                                               FormatJSONEmails(con),
                                               FormatJSONAddresses(con));

            return "{" + jsonContact.Replace("\n", "\\n") + "}";
        }

        private string FormatJSONPhoneNumbers(ContactInformation con)
        {
            string retVal = "";
            string contactFieldFormat = "\"type\":\"{0}\",\"value\":\"{1}\",\"pref\":\"false\"";
            
                for (int i = 0; i < con.PhoneNumbers.Count; i++)
                {
                    string contactField = string.Format(contactFieldFormat, con.PhoneNumbers.ElementAt(i).Category, con.PhoneNumbers.ElementAt(i).Value.ToString());
                    retVal += "{" + contactField + "},";

                }
           
            return retVal.TrimEnd(',');
        }

        private string FormatJSONEmails(ContactInformation con)
        {
            string retVal = "";
            string contactFieldFormat = "\"type\":\"{0}\",\"value\":\"{1}\",\"pref\":\"false\"";

                for (int i = 0; i < con.Emails.Count; i++)
                {
                    string contactField = string.Format(contactFieldFormat, con.Emails.ElementAt(i).Name, con.Emails.ElementAt(i).Value.ToString());
                    retVal += "{" + contactField + "},";

                }
            
            return retVal.TrimEnd(',');
        }

        private string getFormattedJSONAddress(ContactInformation con, bool isPrefered, int element)
        {
            string addressFormatString = "\"pref\":{0}," + // bool
                  "\"type\":\"{1}\"," +
                  "\"formatted\":\"{2}\"," +
                  "\"streetAddress\":\"{3}\"," +
                  "\"locality\":\"{4}\"," +
                  "\"region\":\"{5}\"," +
                  "\"postalCode\":\"{6}\"," +
                  "\"country\":\"{7}\"";

            string formattedAddress = con.Locations.ElementAt(element).Street + " "
                                    + con.Locations.ElementAt(element).City + " "
                                    + con.Locations.ElementAt(element).Region + " "
                                    + con.Locations.ElementAt(element).PostalCode + " "
                                    + con.Locations.ElementAt(element).Country;

            string jsonAddress = string.Format(addressFormatString,
                                    isPrefered ? "\"true\"" : "\"false\"",
                                    con.Locations.ElementAt(element).Name,
                                    formattedAddress,
                                    con.Locations.ElementAt(element).Street,
                                    con.Locations.ElementAt(element).City,
                                    con.Locations.ElementAt(element).Region,
                                    con.Locations.ElementAt(element).PostalCode,
                                    con.Locations.ElementAt(element).Country);
                                    
            return "{" + jsonAddress + "}";
        }

        private string FormatJSONAddresses(ContactInformation con)
        {
            string retVal = "";
            for (int i = 0; i < con.Locations.Count; i++)
            {
                retVal += this.getFormattedJSONAddress(con, false, i) + ",";
            }

            return retVal.TrimEnd(',');
        }
    }
}
