var jiraService = require('./jiraService');
var fs = require('fs');

jiraService.getAllJiras()
.then(function (jiras) {
	console.log('jiras fetched');
	fs.writeFile('testData.json',JSON.stringify(jiras, null, 4),function (err) {
		if (err) {
			console.log('error occurred while writing to file');
		}
		console.log('testData.json generated');
	});
},function () {
	console.log('error occured while fetching jiras');
});