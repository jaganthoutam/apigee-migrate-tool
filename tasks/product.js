/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var products;
module.exports = function(grunt) {
	'use strict';

grunt.registerTask('exportProducts', 'Export all products from org ' + (process.env.ARG || 'product.csv'), function() {
    var url = apigee.from.url;
    var org = apigee.from.org;
    var userid = apigee.from.userid;
    var passwd = apigee.from.passwd;
    var filepath = grunt.config.get("exportProducts.dest.data");
    var done_count = 0;
    var done = this.async();
    grunt.verbose.writeln("========================= export Products ===========================");

    grunt.verbose.writeln("getting products..." + url);

    var productsSource = process.env.ARG || 'product.csv';

    // Assuming you have a function to read products from a CSV file
    // You can replace the "readProductsFromCSV" function with the appropriate code
    var products = readProductsFromCSV(productsSource);

    if (products.length === 0) {
        grunt.verbose.writeln("No Products");
        done();
        return; // Exit the task since there are no products to process
    }

    function processProduct(index) {
        if (index >= products.length) {
            grunt.log.ok('Processed ' + done_count + ' products');
            grunt.verbose.writeln("================== export products DONE()");
            done();
            return;
        }

        var product_url = url + "/" + products[index];
        grunt.file.mkdir(filepath);

        //Call product details
        grunt.verbose.writeln("PRODUCT URL: " + product_url.length + " " + product_url);

        // An Edge bug allows products to be created with very long names which cannot be used in URLs.
        if (product_url.length > 1024) {
            grunt.log.write("SKIPPING Product, URL too long: ");
            done_count++;
            processProduct(index + 1);
        } else {
            request(product_url, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    grunt.verbose.writeln("PRODUCT " + body);
                    var product_detail = JSON.parse(body);
                    var dev_file = filepath + "/" + product_detail.name;
                    grunt.file.write(dev_file, body);

                    grunt.verbose.writeln('Exported Product ' + product_detail.name);
                } else {
                    grunt.verbose.writeln('Error Exporting Product ' + products[index]);
                    grunt.log.error(error);
                }

                done_count++;
                processProduct(index + 1);
            }).auth(userid, passwd, true);
        }
    }

    processProduct(0);
});



	grunt.registerMultiTask('importProducts', 'Import all products to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var files = this.filesSrc;
		var done_count=0;
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		url = url + "/v1/organizations/" + org + "/apiproducts";
		var done = this.async();

		files.forEach(function(filepath) {
			var content = grunt.file.read(filepath);
			//grunt.verbose.writeln(content);	
			request.post({
			  headers: {'content-type' : 'application/json'},
			  url:     url,
			  body:    content
			}, function(error, response, body){
			  var status = 999;
			  if (response)	
				status = response.statusCode;
			  grunt.verbose.writeln('Resp [' + status + '] for product creation ' + this.url + ' -> ' +body);
			  if (error || status!=201)
			  { 
			  	grunt.verbose.error('ERROR Resp [' + status + '] for product creation ' + this.url + ' -> ' +body); 
			  }
			 done_count++;
			if (done_count == files.length)
			{
				grunt.log.ok('Processed ' + done_count + ' products');
				done();
			}
			}.bind( {url: url}) ).auth(userid, passwd, true);

		});
	});

	grunt.registerMultiTask('deleteProducts', 'Delete all products from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var files = this.filesSrc;
		var done_count = 0;
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		url = url + "/v1/organizations/" + org + "/apiproducts/";
		var done = this.async();
		files.forEach(function(filepath) {
			var content = grunt.file.read(filepath);
			var product = JSON.parse(content);
			var del_url = url + product.name;
			grunt.verbose.writeln(del_url);	
			request.del(del_url, function(error, response, body){
			  var status = 999;
			  if (response)	
				status = response.statusCode;
			  grunt.verbose.writeln('Resp [' + status + '] for product deletion ' + this.del_url + ' -> ' + body);
			  if (error || status!=200)
			  { 
			  	grunt.verbose.error('ERROR Resp [' + status + '] for product deletion ' + this.del_url + ' -> ' + body); 
			  }
				done_count++;
				if (done_count == files.length)
				{
					grunt.log.ok('Processed ' + done_count + ' products');
					done();
				}
			}.bind( {del_url: del_url}) ).auth(userid, passwd, true);

		});
	});

};
