// Copyright 2012 Intel Corporation
//
// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <Shlwapi.h>
#include <Shlobj.h>
#define CINTERFACE 1	// Get C definitions for COM header files

#include "lib/sqlite/sqlite3.h"
#include "storage.h"

struct _CordovaDb {
	sqlite3 *db;
	struct _CordovaDb *next;
};
typedef struct _CordovaDb CordovaDb;

static CordovaDb *db_list = NULL;

static CordovaDb *find_cordova_db(int db_id)
{
	CordovaDb *item = db_list;

	while (item) {
		if (item == (CordovaDb *)db_id)
			return item;
		item = item->next;
	}

	return NULL;
}

static HRESULT open_database(BSTR callback_id, BSTR args, VARIANT *result)
{
	int res;
	wchar_t path[MAX_PATH];
	sqlite3 *db;
	CordovaDb *cordova_db;

	if(!SUCCEEDED(SHGetFolderPath(NULL, CSIDL_APPDATA, NULL, 0, path))) 
		return E_FAIL;

	PathAppend(path, L"Cordova\\db");
	res = SHCreateDirectory(NULL,path);
	if(!SUCCEEDED(res) && (res != ERROR_FILE_EXISTS) && (res != ERROR_ALREADY_EXISTS))
		return E_FAIL;

	PathAppend(path, next_string(args, '\"'));
	res = sqlite3_open((const char *)path, &db);
	if (res != 0) {
		sqlite3_close(db);
		return E_FAIL;
	}

	cordova_db = (CordovaDb *)malloc(sizeof(CordovaDb));
	cordova_db->db = db;

	cordova_db->next = db_list;
	db_list = cordova_db;
	
	VariantInit(result);
	result->vt = VT_INT;
	result->intVal = (int)cordova_db;

	return S_OK;
}

static HRESULT execute_sql(BSTR callback_id, BSTR args)
{
	return S_OK;
}

HRESULT storage_exec(BSTR callback_id, BSTR action, BSTR args, VARIANT *result)
{
	if (!wcscmp(action, L"openDatabase"))
		return open_database(callback_id, args, result);
	if (!wcscmp(action, L"executeSql"))
		return execute_sql(callback_id, args);

	return DISP_E_MEMBERNOTFOUND;
}

void storage_close(void)
{
	while (db_list != NULL) {
		CordovaDb *item;

		sqlite3_close(db_list->db);

		item = db_list;
		db_list = db_list->next;

		free(item);
	}
}

DEFINE_CORDOVA_MODULE(Storage, L"Storage", storage_exec, storage_close)