#include <collection.h>
#include <ppltasks.h>

#include "Database.h"
#include "Statement.h"

using Windows::UI::Core::CoreDispatcher;
using Windows::UI::Core::CoreDispatcherPriority;
using Windows::UI::Core::CoreWindow;
using Windows::UI::Core::DispatchedHandler;

namespace SQLite3 {
  static SafeParameterVector CopyParameters(ParameterVector^ params) {
    SafeParameterVector paramsCopy;

    if (params) {
      std::copy(begin(params), end(params), std::back_inserter(paramsCopy));
    }

    return paramsCopy;
  }

  IAsyncOperation<Database^>^ Database::OpenAsync(Platform::String^ dbPath) {
  CoreDispatcher^ dispatcher = CoreWindow::GetForCurrentThread()->Dispatcher;
    return Concurrency::create_async([dbPath, dispatcher]() -> Database^ {
      sqlite3* sqlite;

      int ret = sqlite3_open16(dbPath->Data(), &sqlite);

      if (ret != SQLITE_OK) {
        sqlite3_close(sqlite);
        throwSQLiteError(ret);
      }

    return ref new Database(sqlite, dispatcher);
    });
  }

  void Database::EnableSharedCache(bool enable) {
    int ret = sqlite3_enable_shared_cache(enable);
    if (ret != SQLITE_OK) {
      throwSQLiteError(ret);
    }
  }

  Database::Database(sqlite3* sqlite, CoreDispatcher^ dispatcher)
    : sqlite(sqlite)
    , dispatcher(dispatcher) {
      sqlite3_update_hook(sqlite, UpdateHook, reinterpret_cast<void*>(this));
  }

  Database::~Database() {
    sqlite3_close(sqlite);
  }

  void Database::UpdateHook(void* data, int action, char const* dbName, char const* tableName, sqlite3_int64 rowId) {
    Database^ database = reinterpret_cast<Database^>(data);
    database->OnChange(action, dbName, tableName, rowId);
  }

  void Database::OnChange(int action, char const* dbName, char const* tableName, sqlite3_int64 rowId) {
    DispatchedHandler^ handler;
    ChangeEvent event;
    event.RowId = rowId;
    event.TableName = ToPlatformString(tableName);

    switch (action) {
    case SQLITE_INSERT:
      handler = ref new DispatchedHandler([this, event]() {
        Insert(this, event);
      });
      break;
    case SQLITE_UPDATE:
      handler = ref new DispatchedHandler([this, event]() {
        Update(this, event);
      });
      break;
    case SQLITE_DELETE:
      handler = ref new DispatchedHandler([this, event]() {
        Delete(this, event);
      });
      break;
    }
    if (handler) {
      dispatcher->RunAsync(CoreDispatcherPriority::Normal, handler);
    }
  }

  IAsyncAction^ Database::RunAsyncVector(Platform::String^ sql, ParameterVector^ params) {
    return RunAsync(sql, CopyParameters(params));
  }

  IAsyncAction^ Database::RunAsyncMap(Platform::String^ sql, ParameterMap^ params) {
    return RunAsync(sql, params);
  }

  template <typename ParameterContainer>
  IAsyncAction^ Database::RunAsync(Platform::String^ sql, ParameterContainer params) {
    return Concurrency::create_async([this, sql, params]() -> void {
      try {
        StatementPtr statement = PrepareAndBind(sql, params);
        statement->Run();
      } catch (Platform::Exception^ e) {
        lastErrorMsg = (WCHAR*)sqlite3_errmsg16(sqlite);
        throw;
      }
    });
  }

  IAsyncOperation<Platform::String^>^ Database::OneAsyncVector(Platform::String^ sql, ParameterVector^ params) {
    return OneAsync(sql, CopyParameters(params));
  }

  IAsyncOperation<Platform::String^>^ Database::OneAsyncMap(Platform::String^ sql, ParameterMap^ params) {
    return OneAsync(sql, params);
  }

  template <typename ParameterContainer>
  IAsyncOperation<Platform::String^>^ Database::OneAsync(Platform::String^ sql, ParameterContainer params) {
    return Concurrency::create_async([this, sql, params]() -> Platform::String^ {
      try {
        StatementPtr statement = PrepareAndBind(sql, params);
        return statement->One();
      } catch (Platform::Exception^ e) {
        lastErrorMsg = (WCHAR*)sqlite3_errmsg16(sqlite);
        throw;
      }
    });
  }

  IAsyncOperation<Platform::String^>^ Database::AllAsyncMap(Platform::String^ sql, ParameterMap^ params) {
    return AllAsync(sql, params);
  }

  IAsyncOperation<Platform::String^>^ Database::AllAsyncVector(Platform::String^ sql, ParameterVector^ params) {
    return AllAsync(sql, CopyParameters(params));
  }

  template <typename ParameterContainer>
  IAsyncOperation<Platform::String^>^ Database::AllAsync(Platform::String^ sql, ParameterContainer params) {
    return Concurrency::create_async([this, sql, params]() -> Platform::String^ {
      try {
        StatementPtr statement = PrepareAndBind(sql, params);
        return statement->All();
      } catch (Platform::Exception^ e) {
        lastErrorMsg = (WCHAR*)sqlite3_errmsg16(sqlite);
        throw;
      }
    });
  }

  IAsyncAction^ Database::EachAsyncVector(Platform::String^ sql, ParameterVector^ params, EachCallback^ callback) {
    return EachAsync(sql, CopyParameters(params), callback);
  }

  IAsyncAction^ Database::EachAsyncMap(Platform::String^ sql, ParameterMap^ params, EachCallback^ callback) {
    return EachAsync(sql, params, callback);
  }

  template <typename ParameterContainer>
  IAsyncAction^ Database::EachAsync(Platform::String^ sql, ParameterContainer params, EachCallback^ callback) {
    return Concurrency::create_async([this, sql, params, callback]() -> void {
      try {
        StatementPtr statement = PrepareAndBind(sql, params);
        statement->Each(callback, dispatcher);
      } catch (Platform::Exception^ e) {
        lastErrorMsg = (WCHAR*)sqlite3_errmsg16(sqlite);
        throw;
      }
    });
  }

  bool Database::GetAutocommit() {
    return sqlite3_get_autocommit(sqlite) != 0;
  }

  long long Database::GetLastInsertRowId() {
    return sqlite3_last_insert_rowid(sqlite);
  }

  Platform::String^ Database::GetLastError() {
    return ref new Platform::String(lastErrorMsg.c_str());
  }

  template <typename ParameterContainer>
  StatementPtr Database::PrepareAndBind(Platform::String^ sql, ParameterContainer params) {
    StatementPtr statement = Statement::Prepare(sqlite, sql);
    statement->Bind(params);
    return statement;
  }
}
