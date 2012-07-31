#pragma once;

#include <memory>
#include <vector>

namespace SQLite3 {
  ref class Database;
  class Statement;
  typedef std::unique_ptr<Statement> StatementPtr;

  typedef Windows::Foundation::Collections::IVectorView<Platform::Object^> ParameterVector;
  typedef std::vector<Platform::Object^> SafeParameterVector;

  typedef Windows::Foundation::Collections::PropertySet ParameterMap;

  public delegate void EachCallback(Platform::String^);

  using Windows::Foundation::IAsyncAction;
  using Windows::Foundation::IAsyncOperation;

  void throwSQLiteError(int resultCode);
  std::wstring ToWString(const char* utf8String);
  Platform::String^ ToPlatformString(const char* utf8String);
}
