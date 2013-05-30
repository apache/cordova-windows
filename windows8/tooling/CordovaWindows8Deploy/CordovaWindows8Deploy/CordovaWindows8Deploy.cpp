// ConsoleApplication2.cpp : Defines the entry point for the console application.
//

#include <stdio.h>
#include <tchar.h>
#include <shlobj.h>
#include <stdio.h>
#include <shobjidl.h>
#include <objbase.h>
#include <atlbase.h>
#include <string>

int _tmain(int argc, _TCHAR* argv[])
{
    DWORD dwProcessId = 0;
    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);

    if(SUCCEEDED(hr))
    {
        if(argc == 2)
        {

            CComPtr<IApplicationActivationManager> spAppActivationManager;
            // get IApplicationActivationManager
            hr = CoCreateInstance(CLSID_ApplicationActivationManager,
                                    NULL,
                                    CLSCTX_LOCAL_SERVER,
                                    IID_IApplicationActivationManager,
                                    (LPVOID*)&spAppActivationManager);

            // allow it to be launched in the foreground.
            if (SUCCEEDED(hr))
            {
                hr = CoAllowSetForegroundWindow(spAppActivationManager, NULL);
            }
 
            // Launch it!
            if (SUCCEEDED(hr))
            {  
                LPCWSTR appId = argv[1];
                hr = spAppActivationManager->ActivateApplication(appId,
                                                                NULL,
                                                                AO_NONE,
                                                                &dwProcessId);
            }
        }
        CoUninitialize();
    }

    return hr;
}

