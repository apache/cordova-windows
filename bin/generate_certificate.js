/*
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
*/

try {
  require.resolve('node-forge');
} catch (err) {
  console.log("certificate unchanged - node-forge package missing!");
  return;
}

var path  = require('path'),
    fs  = require('fs'),
    shell = require('shelljs'),
    forge = require('node-forge');

// Usage: generate_certificate --newkey=KeySize Author ValidityInYears
//     --newkey=KeySize : Create a new key of KeySize. NOTE: long process
//     Author           : The path the project you would like to update.
//     ValidityInYears  : The number of years that this certificate should be valid.
// examples:
//     generate_certificate
//     generate_certificate "Apache Cordova Team" 10

var ROOT = path.join(__dirname, '..'),
    KEY = path.join(__dirname, 'key'),
    file = path.join(ROOT, 'template', 'CordovaApp_TemporaryKey.pfx'),
    prifile = path.join(KEY, 'key.pri'),
    pubfile = path.join(KEY, 'key.pub');

function generate_key(keysize, tick) {
  keysize = keysize || 2048;

  var chunk = 0,
      msperchunk = 200, // run in 200 ms chunks
      keystate = forge.rsa.createKeyPairGenerationState(keysize);

  while(!forge.rsa.stepKeyPairGenerationState(keystate, msperchunk)) {
    tick(++chunk);
  }

  var newkey = keystate.keys;

  var pub = forge.pki.publicKeyToRSAPublicKeyPem(newkey.publicKey);

  var pri = forge.pki.privateKeyToPem(newkey.privateKey);

  fs.writeFileSync(prifile, pri);
  fs.writeFileSync(pubfile, pub);
};

function generate_certificate(author, validityInYears) {
  author = author || "Apache Cordova Team";
  validityInYears = validityInYears || 10;

  var password = null, // no password for the pfx file
      newcert = forge.pki.createCertificate(),
      serialNumber = forge.random.getBytesSync(16);

  newcert.serialNumber = forge.util.bytesToHex(serialNumber);

  // from midnight GMT today
  newcert.validity.notBefore = new Date();
  newcert.validity.notBefore.setUTCHours(0);
  newcert.validity.notBefore.setUTCMinutes(0);
  newcert.validity.notBefore.setUTCSeconds(0);

  // to midnight GMT in 10 years
  newcert.validity.notAfter = new Date();
  newcert.validity.notAfter.setUTCHours(0);
  newcert.validity.notAfter.setUTCMinutes(0);
  newcert.validity.notAfter.setUTCSeconds(0);
  newcert.validity.notAfter.setUTCFullYear(newcert.validity.notBefore.getUTCFullYear() + validityInYears);

  var name = [{
    shortName: 'CN',
    value: author
  }];
  newcert.setIssuer(name);
  newcert.setSubject(name);

  var extensions = [{
    name: 'basicConstraints',
    cA: false
  }, {
    name: 'extKeyUsage',
    codeSigning: true,
    "1.3.6.1.4.1.311.10.3.13": true // XCN_OID_KP_LIFETIME_SIGNING
  }];
  newcert.setExtensions(extensions);

  var pub = fs.readFileSync(pubfile);
  var pri = fs.readFileSync(prifile);
  var newkey = {
      publicKey: forge.pki.publicKeyFromPem(pub),
      privateKey: forge.pki.privateKeyFromPem(pri),
  };

  newcert.publicKey = newkey.publicKey;

  newcert.sign(newkey.privateKey, forge.md.sha256.create());

  var newp12Asn1 = forge.pkcs12.toPkcs12Asn1(newkey.privateKey, newcert, password, {algorithm: "aes256"});
  var newp12Der = forge.asn1.toDer(newp12Asn1).getBytes();

  fs.writeFileSync(file, newp12Der, { 'encoding': 'binary' });

  return newcert;
};

function key_size(arg) {
  var tokens = arg.toLowerCase().split('=');
  return tokens.length < 3 && tokens[0].trim() == "--newkey" ? Number(tokens[1] || 2048) : undefined;
}



var keySize = process.argv.map(key_size).filter(function(s){return s !== undefined;})[0],
    positionalArgs = process.argv.filter(function(arg) {return key_size(arg) === undefined;}),
    validityInYears = Number(positionalArgs[2] || 10),
    author = positionalArgs[3] || "Apache Cordova Team",
    states = ["-", "\\", "|", "/"];

if (keySize >= 1024) {
  generate_key(keySize, function(n) {
    process.stdout.write(states[n % states.length]);
    process.stdout.cursorTo(0);
  });
  process.stdout.write(' ');
  process.stdout.cursorTo(0);
}

var newcert = generate_certificate(author, validityInYears);

console.log("certificate valid until  : " + newcert.validity.notAfter);
