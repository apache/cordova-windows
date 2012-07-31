#pragma once

#include "sqlite3.h"
#include "Common.h"

namespace SQLite3 {
  public value struct ChangeEvent {
    Platform::String^ TableName;
    int64 RowId;
  };
  
  public delegate void ChangeHandler(Platform::Object^ source, ChangeEvent event);
  
  public ref class Database sealed {
  public:
    static IAsyncOperation<Database^>^ OpenAsync(Platform::String^ dbPath);
    static void EnableSharedCache(bool enable);

    ~Database();

    IAsyncAction^ RunAsyncVector(Platform::String^ sql, ParameterVector^ params);
    IAsyncAction^ RunAsyncMap(Platform::String^ sql, ParameterMap^ params);
    IAsyncOperation<Platform::String^>^ OneAsyncVector(Platform::String^ sql, ParameterVector^ params);
    IAsyncOperation<Platform::String^>^ OneAsyncMap(Platform::String^ sql, ParameterMap^ params);
    IAsyncOperation<Platform::String^>^ AllAsyncVector(Platform::String^ sql, ParameterVector^ params);
    IAsyncOperation<Platform::String^>^ AllAsyncMap(Platform::String^ sql, ParameterMap^ params);
    IAsyncAction^ EachAsyncVector(Platform::String^ sql, ParameterVector^ params, EachCallback^ callback);
    IAsyncAction^ EachAsyncMap(Platform::String^ sql, ParameterMap^ params, EachCallback^ callback);

    bool GetAutocommit();
    long long GetLastInsertRowId();
    Platform::String^ GetLastError();

    event ChangeHandler^ Insert;
    event ChangeHandler^ Update;
    event ChangeHandler^ Delete;

  private:
    Database(sqlite3* sqlite, Windows::UI::Core::CoreDispatcher^ dispatcher);

    template <typename ParameterContainer>
    StatementPtr PrepareAndBind(Platform::String^ sql, ParameterContainer params);

    template <typename ParameterContainer>
    IAsyncAction^ RunAsync(Platform::String^ sql, ParameterContainer params);
    template <typename ParameterContainer>
    IAsyncOperation<Platform::String^>^ OneAsync(Platform::String^ sql, ParameterContainer params);
    template <typename ParameterContainer>
    IAsyncOperation<Platform::String^>^ AllAsync(Platform::String^ sql, ParameterContainer params);
    template <typename ParameterContainer>
    IAsyncAction^ EachAsync(Platform::String^ sql, ParameterContainer params, EachCallback^ callback);

    static void __cdecl UpdateHook(void* data, int action, char const* dbName, char const* tableName, sqlite3_int64 rowId);
    void OnChange(int action, char const* dbName, char const* tableName, sqlite3_int64 rowId);

    Windows::UI::Core::CoreDispatcher^ dispatcher;
    sqlite3* sqlite;
    std::wstring lastErrorMsg;
  };
}
