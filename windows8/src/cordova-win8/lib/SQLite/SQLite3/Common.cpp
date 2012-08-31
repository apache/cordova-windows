#include <Windows.h>

#include "Common.h"

namespace SQLite3 {
  void throwSQLiteError(int resultCode) {
    HRESULT hresult = MAKE_HRESULT(SEVERITY_ERROR, FACILITY_ITF, resultCode);
    hresult |= 0x20000000; // Set "customer-defined" bit
    throw ref new Platform::COMException(hresult);
  }

  std::wstring ToWString(const char* utf8String) {
    DWORD numCharacters = MultiByteToWideChar(CP_UTF8, 0, utf8String, -1, nullptr, 0);
    auto wideText = new std::wstring::value_type[numCharacters];
    MultiByteToWideChar(CP_UTF8, 0, utf8String, -1, wideText, numCharacters);
    std::wstring result(wideText);
    delete[] wideText;
    return result;
  }

  Platform::String^ ToPlatformString(const char* utf8String) {
    return ref new Platform::String(ToWString(utf8String).data());
  }
}
