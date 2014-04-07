<#
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
#>

param(
    [Parameter(Mandatory=$true, Position=0, ValueFromPipelineByPropertyName=$true)]
    [string] $platformRoot
)

$configFile = "$platformRoot\config.xml"
$manifestFile = "$platformRoot\package.appxmanifest"

[xml]$config = Get-Content $configFile
[xml]$manifest = Get-Content $manifestFile

# Replace app start page with config.xml setting.
$startPage = $config.widget.content.src
$manifest.Package.Applications.Application.StartPage = "www/$startpage"

# Add domain whitelist rules
$acls = [string[]]$config.widget.access.origin
$rules = $manifest.Package.Applications.Application.ApplicationContentUriRules
$NS = $manifest.DocumentElement.NamespaceURI

# Remove existing rules from manifest
if ($rules) { $manifest.Package.Applications.Application.RemoveChild($rules)}

if ($acls -and ($acls -notcontains "*")) {
    $rules = $manifest.CreateElement("ApplicationContentUriRules", $NS)
    $manifest.Package.Applications.Application.AppendChild($rules)
    $acls | foreach {
        $elem = $manifest.CreateElement("Rule", $NS)
        $elem.SetAttribute("Match", $_)
        $elem.SetAttribute("Type", "include")
        $rules.AppendChild($elem)
    }
}

$xmlWriter = New-Object System.Xml.XmlTextWriter($manifestFile, $null)
$xmlWriter.Formatting = "Indented"
$xmlWriter.Indentation = 4
$manifest.WriteContentTo($xmlWriter)
$xmlWriter.Close()