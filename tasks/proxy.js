/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var proxies;
module.exports = function(grunt) {
	'use strict';
	
grunt.registerTask('exportProxies', 'Export all proxies from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
    var url = apigee.from.url;
    var org = apigee.from.org;
    var userid = apigee.from.userid;
    var passwd = apigee.from.passwd;
    var fs = require('fs');
    var filepath = grunt.config.get("exportProxies.dest.data");
    var done_count = 0;
    var done = this.async();

    grunt.verbose.writeln("========================= export Proxies ===========================");
    grunt.verbose.writeln("getting proxies..." + url);

    // Get the proxies from a CSV file or use the default file "proxies.csv"
    var proxiesCSVFile = grunt.option('proxiesCSVFile') || 'proxies.csv'; // Use --proxiesCSVFile=path/to/proxies.csv to specify the CSV file path or use the default "proxies.csv"

    // Read proxies from the CSV file
    var csv = fs.readFileSync(proxiesCSVFile, 'utf-8');
    var proxies = csv.split('\n').map(function(proxy) {
        return proxy.trim();
    });

    var totalProxies = proxies.length;

    proxies.forEach(function(proxyName) {
        var proxy_url = url + "/" + proxyName;
        grunt.file.mkdir(filepath);

        // Call proxy details
        request(proxy_url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                grunt.verbose.writeln(body);
                var proxy_detail = JSON.parse(body);
                var isDeployed = proxy_detail.isDeployed; // Check if the proxy is deployed
                if (isDeployed) {
                    var max_rev = proxy_detail.revision[proxy_detail.revision.length - 1];
                    var proxy_download_url = url + "/" + proxy_detail.name + "/revisions/" + max_rev + "?format=bundle";
                    grunt.verbose.writeln("\nFetching proxy bundle  : " + proxy_download_url);

                    request(proxy_download_url).auth(userid, passwd, true)
                        .pipe(fs.createWriteStream(filepath + "/" + proxy_detail.name + '.zip'))
                        .on('close', function () {
                            grunt.verbose.writeln('Proxy ' + proxy_detail.name + '.zip written!');
                            done_count++;
                            if (done_count == totalProxies) {
                                grunt.log.ok('Exported ' + done_count + ' proxies.');
                                grunt.verbose.writeln("================== export proxies DONE()" );
                                done();
                            }
                        });
                } else {
                    done_count++;
                    if (done_count == totalProxies) {
                        grunt.verbose.writeln('No deployed proxies found for export.');
                        done();
                    } else {
                        grunt.verbose.writeln('Proxy ' + proxy_detail.name + ' is not deployed.');
                    }
                }
            }
            else {
                done_count++;
                if (done_count == totalProxies) {
                    grunt.verbose.writeln('Error exporting ' + done_count + ' proxies.');
                    done();
                } else {
                    grunt.verbose.writeln('Error exporting ' + proxyName);
                }
                grunt.log.error(error);
            }
        }).auth(userid, passwd, true);
        // End proxy details
    });
});


	grunt.registerMultiTask('importProxies', 'Import all proxies to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var files;
		var done_count = 0;
		url = url + "/v1/organizations/" + org + "/apis?action=import&name=";
		var fs = require('fs');
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		else
		{
			files = this.filesSrc;
		}

		files.forEach(function(filepath) {
			//console.log(filepath);
			var filename = filepath.replace(/^.*[\\\/]/, '');
			var name = filename.slice(0, -4);
			//console.log(name);
			var req = request.post(url+name, function (err, resp, body) {
			  if (err) {
			    grunt.log.error(err);
			  } else {
			    grunt.verbose.writeln('Resp [' + resp.statusCode + '] for proxy creation ' + this.url + ' -> ' + body);
			  }
			  done_count++;
			  if (done_count == files.length)
				{
					grunt.log.ok('Processed ' + done_count + ' proxies');
					done();
				}
			}.bind( {url: url+name}) ).auth(userid, passwd, true);
			var form = req.form();
			form.append('file', fs.createReadStream(filepath));
		});
		var done = this.async();
	});

	grunt.registerMultiTask('deleteProxies', 'Delete all proxies from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count =0;
		var files;
		url = url + "/v1/organizations/" + org + "/apis/";
		var done = this.async();
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		else
		{
			files = this.filesSrc;
		}
		var done = this.async();
		files.forEach(function(filepath) {
			grunt.verbose.writeln("processing file " + filepath);
			var folders = filepath.split("/");
			var proxy_file = folders[folders.length - 1];
			var proxy = proxy_file.split(".")[0];
			var app_del_url = url + proxy;
			grunt.verbose.writeln(app_del_url);
			request.del(app_del_url,function(error, response, body){
			  grunt.verbose.writeln('Resp [' + response.statusCode + '] for proxy deletion ' + this.app_del_url + ' -> ' + body);
			  if (error || response.statusCode!=200)
			  	grunt.verbose.error('ERROR Resp [' + response.statusCode + '] for proxy deletion ' + this.app_del_url + ' -> ' + body); 
			  done_count++;
			  	if (done_count == files.length)
				{
					grunt.log.ok('Processed ' + done_count + ' proxies');
					done();
				}
			}.bind( {app_del_url: app_del_url}) ).auth(userid, passwd, true);	
		});
	});


	grunt.registerTask('deployProxies', 'Deploy revision 1 on all proxies for org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
			var url = apigee.to.url;
			var org = apigee.to.org;
			var env = apigee.to.env;
			var userid = apigee.to.userid;
			var passwd = apigee.to.passwd;
			var done_count =0;
			var done = this.async();
			url = url + "/v1/organizations/" + org ;
			var proxies_url = url +  "/apis" ;

			request(proxies_url, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					//grunt.log.write(body);
				    proxies =  JSON.parse(body);
				   
				    for (var i = 0; i < proxies.length; i++) {
				    	var proxy_url = url + "/environments/" + env + "/apis/" + proxies[i] + "/revisions/1/deployments";
				    	grunt.verbose.writeln(proxy_url);
				    	//Call proxy deploy
						request.post(proxy_url, function (error, response, body) {
							if (!error && response.statusCode == 200) {
								grunt.verbose.writeln('Resp [' + response.statusCode + '] for proxy deployment ' + this.proxy_url + ' -> ' + body);
							}
							else
							{
								grunt.log.error('ERROR Resp [' + response.statusCode + '] for proxy deployment ' + this.proxy_url + ' -> ' + body);
							}
							done_count++;
						  	if (done_count == proxies.length)
							{
								grunt.log.ok('Processed ' + done_count + ' proxies');
								done();
							}
						}).auth(userid, passwd, true);
				    	// End proxy deploy
				    }; 
				    
				} 
				else
				{
					grunt.log.error(error);
				}
			}.bind( {proxy_url: proxy_url}) ).auth(userid, passwd, true);
	});

	grunt.registerTask('undeployProxies', 'UnDeploy revision 1 on all proxies for org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
			var url = apigee.to.url;
			var org = apigee.to.org;
			var env = apigee.to.env;
			var userid = apigee.to.userid;
			var passwd = apigee.to.passwd;
			var done_count =0;
			var done = this.async();
			url = url + "/v1/organizations/" + org ;
			var proxies_url = url +  "/apis" ;

			request(proxies_url, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					//grunt.log.write(body);
				    proxies =  JSON.parse(body);
				   
				    for (var i = 0; i < proxies.length; i++) {
				    	var proxy_url = url + "/environments/" + env + "/apis/" + proxies[i] + "/revisions/1/deployments";
				    	grunt.verbose.writeln(proxy_url);
				    	//Call proxy undeploy
						request.del(proxy_url, function (error, response, body) {
							if (!error && response.statusCode == 200) {
								grunt.verbose.writeln(body);
							}
							else
							{
								grunt.log.error(error);
							}
							done_count++;
						  	if (done_count == proxies.length)
							{
								grunt.log.ok('Processed ' + done_count + ' proxies');
								done();
							}
						}).auth(userid, passwd, true);
				    	// End proxy undeploy
				    }; 
				    
				} 
				else
				{
					grunt.log.error(error);
				}
			}).auth(userid, passwd, true);
	});

};
