var express = require('express');
var request = require('request')

var app=express();

app.post('/getAllJiras',function (req,res) {
	var data;
	var pipe = req.pipe(request.post('https://obujira.searshc.com/jira/rest/api/2/search'));
	pipe.on('data',function (chunk) {
		data += chunk;
	});
	pipe.on('end',function () {
		res.send(data);
	});
});

app.use(express.static('public'));



app.listen(8000,function () {
	console.log('server listening at port 8000');
});