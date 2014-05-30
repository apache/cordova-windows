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

Write-Host "Applying Platform Config ..."

$configFile = "$platformRoot\config.xml"
$manifestFile = "$platformRoot\package.appxmanifest"

[xml]$config = Get-Content $configFile
[xml]$manifest = Get-Content $manifestFile

# Replace app start page with config.xml setting.
if($config.widget.content -and $config.widget.content.src) {
    $startPage = $config.widget.content.src
    $manifest.Package.Applications.Application.StartPage = "www/$startpage"
}

# Add domain whitelist rules

$acls = [string[]]$config.widget.access.origin
$rules = $manifest.Package.Applications.Application.ApplicationContentUriRules
$NS = $manifest.DocumentElement.NamespaceURI

# Remove existing rules from manifest

if ($rules) { 
    $manifest.Package.Applications.Application.RemoveChild($rules)
}

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

# Splash screen support
$configSplashScreen = $config.SelectNodes('//*[local-name()="preference"][@name="SplashScreen"]').value
if($configSplashScreen) 
{
    "Setting SplashScreen = $configSplashScreen"
    $imgPath = $null;

    # do search relative to platform and app folders
    foreach ($testPath in @($configSplashScreen, "..\..\$configSplashScreen")) 
    {
        $testPath = join-path $platformRoot $testPath

        if (Test-Path -PathType Leaf $testPath)
        {
            $imgPath = $testPath;
            break
        }
    }

    if ($imgPath -eq $null)
    {
        "Unable to locate splash image: $configSplashScreen"
    } else {
        # Default splash screen is stored as 'images\splashscreen.png'
        # http://msdn.microsoft.com/en-us/library/windows/apps/hh465346.aspx
        Copy-Item $imgPath -Destination (join-path $platformRoot "images\splashscreen.png")
    }
}

# Format splash screen background color to windows8 format
$configSplashScreenBGColor = $config.SelectNodes('//*[local-name()="preference"][@name="SplashScreenBackgroundColor"]').value
if($configSplashScreenBGColor) 
{
    "Setting SplashScreenBackgroundColor = $configSplashScreenBGColor"

    $bgColor = ($configSplashScreenBGColor -replace "0x", "") -replace "#", ""

    # Double all bytes if color specified as "fff"
    if ($bgColor.Length -eq 3) {
        $bgColor = $bgColor[0] + $bgColor[0] + $bgColor[1] + $bgColor[1] + $bgColor[2] + $bgColor[2] 
    }

    # Parse hex representation to array of color bytes [b, g, r, a]
    $colorBytes = [System.BitConverter]::GetBytes(
        [int]::Parse($bgColor,
        [System.Globalization.NumberStyles]::HexNumber))

    Add-Type -AssemblyName PresentationCore

    # Create new Color object ignoring alpha, because windows 8 doesn't support it
    # see http://msdn.microsoft.com/en-us/library/windows/apps/br211471.aspx
    $color = ([System.Windows.Media.Color]::FromRgb(
        $colorBytes[2], $colorBytes[1], $colorBytes[0]
        # FromRGB method add 100% alpha, so we remove it from resulting string
        ).ToString()) -replace "#FF", "#"

    $manifest.Package.Applications.Application.VisualElements.SplashScreen.BackgroundColor = [string]$color
}


# Format background color to windows8 format
$configBgColor = $config.SelectNodes('//*[local-name()="preference"][@name="BackgroundColor"]').value

if($configBgColor) 
{
    "Setting BackgroundColor = $configBgColor"
    $bgColor = ($configBgColor -replace "0x", "") -replace "#", ""

    # Double all bytes if color specified as "fff"
    if ($bgColor.Length -eq 3) {
        $bgColor = $bgColor[0] + $bgColor[0] + $bgColor[1] + $bgColor[1] + $bgColor[2] + $bgColor[2] 
    }

    # Parse hex representation to array of color bytes [b, g, r, a]
    $colorBytes = [System.BitConverter]::GetBytes(
        [int]::Parse($bgColor,
        [System.Globalization.NumberStyles]::HexNumber))

    Add-Type -AssemblyName PresentationCore

    # Create new Color object ignoring alpha, because windows 8 doesn't support it
    # see http://msdn.microsoft.com/en-us/library/windows/apps/br211471.aspx
    $color = ([System.Windows.Media.Color]::FromRgb(
        $colorBytes[2], $colorBytes[1], $colorBytes[0]
        # FromRGB method add 100% alpha, so we remove it from resulting string
        ).ToString()) -replace "#FF", "#"

    $manifest.Package.Applications.Application.VisualElements.BackgroundColor = [string]$color
}

# Write modified manifest file
$xmlWriter = New-Object System.Xml.XmlTextWriter($manifestFile, $null)
$xmlWriter.Formatting = "Indented"
$xmlWriter.Indentation = 4
$manifest.WriteContentTo($xmlWriter)
$xmlWriter.Close()