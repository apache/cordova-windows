var connect = require('connect');
var url = require('url');
var fs = require('fs');

var app = connect()
  .use(connect.logger('dev'))
  //.use(connect.static('C:\Application1\Application1'))
  .use(connect.bodyParser())
  .use(function(req, res){
	
   //TODO something what can listen to the behavior of the click of the button "export"
   var pathname = url.parse(req.url).pathname;
   
   if( pathname === "/upload" ){
   
       fs.readFile(req.files["source"].path, function (err, data) {
           console.log(data);
           fs.writeFile('\\\\vmware-host\\Shared Folders\\Documents\\per\\message.js', data, function (err) {
               if (err) throw err;

               console.log('It\'s saved!');
               res.end("ok");
       
       
        });

   });
    
	//console.log('POST to cloud9');
    //var item =  [{name:'file',value:req.files['file'].path,isFile:true,fileEncoding:'binary'}];
    //doHttpPost('localhost',8080,'/GUI',item);
   
   }
   
   
  })
 .listen(5000);
 
 
function doHttpPost(_host, _port, _path, items) {
	var http = require('http'),
	    fs = require('fs'),
	    path = require('path'),
	    boundary = Math.random(),
	    postData = [];
	
	formDataAndPost(items);

	function formDataAndPost(items){
		var item = items.shift();
		if (!item) {
			if (postData.length > 0) {
				postData.push(new Buffer("--" + boundary + "--", 'ascii'));
				post(_host, _port, _path, postData, boundary);
			}
			return;
		}
		
		if (item.isFile) {
			var fileName = path.basename(item.value),
			    encoding = item.fileEncoding?item.fileEncoding:'binary',
			    fileContents = '',
			    fileReader;

			postData.push(new Buffer(EncodeFilePart(boundary, 'application/octet-stream', item.name, fileName), 'ascii'));
			fileReader = fs.createReadStream(item.value, {'encoding': encoding});
			fileReader.on('data', function(data) {
				fileContents += data;
			});
			fileReader.on('end', function() {
				postData.push(new Buffer(fileContents, encoding));
				postData.push(new Buffer("\r\n", 'ascii'));
				formDataAndPost(items);
			});
		}
		else {
			postData.push(new Buffer(EncodeFieldPart(boundary, item.name, item.value), 'ascii'));
			formDataAndPost(items);
		}
	};
	
	function post(p_host, p_port, p_path, p_data, p_boundary) {
		var dataLength = 0,
		    postOptions, postRequest;
		
		// Calculate data length
		for(var i = 0; i < p_data.length; i++) {
			dataLength += p_data[i].length;
		}

		postOptions = {
			'host': p_host,
			'port': p_port,
			'path': p_path,
			'method': 'POST',
			'headers' : {
				'Content-Type' : 'multipart/form-data; boundary=' + p_boundary,
				'Content-Length' : dataLength
			}
		};

		postRequest = http.request(postOptions, function(response){
	  		console.log('STATUS: ' + response.statusCode);
	  		console.log('HEADERS: ' + JSON.stringify(response.headers));
			response.setEncoding('utf8');
			response.on('data', function(chunk) {
				// Respond to http response
				console.log(chunk);
			});
			response.on('end', function() {
				// Respond to http response
				console.log('Response end');
			});
		});
		postRequest.on('error', function (e) {
			// Deal with http request error
			console.log('\u001b[31m');
			console.log('*****ERROR***** http request to ' + p_host + ':' + p_port + p_path);
			console.log('*****ERROR***** message: ' + e.message);
			console.log('\u001b[0m');
		});

		for (var i = 0; i < p_data.length; i++) {
			postRequest.write(p_data[i]);
		}
		postRequest.end();
	}

	function EncodeFieldPart(boundary,name,value) {
		var return_part = "--" + boundary + "\r\n";
		return_part += "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n";
		return_part += value + "\r\n";
		return return_part;
	}

	function EncodeFilePart(boundary,type,name,filename) {
		var return_part = "--" + boundary + "\r\n";
		return_part += "Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + filename + "\"\r\n";
		return_part += "Content-Type: " + type + "\r\n\r\n";
		return return_part;
	}
	
}
