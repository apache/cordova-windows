<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
# 
# http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->
## Release Notes for Cordova (Windows8) ##

Update these notes using: git log --pretty=format:'* %s' --topo-order --no-merges apache/3.3.x...HEAD

Cordova is a static library that enables developers to include the Cordova API in their Windows Store application projects easily, and also create new Cordova-based Windows Store application projects through the command-line.

### 3.3.0 (20131210) ###

* update VERSION to 3.3.0
* Update 3.3.0 tagged js
* CB-5543 update to 3.3.0-rc1
* CB-5040 cordova run windows8 has no effect
* CB-5324 Windows8 build fails due to invalid image references
* Fix issue using VS 2013 version of MSBuild
* CB-5323 Windows8 build fails due to expired certificate. Generated new temporary certificate, valid untill 11.11.2014