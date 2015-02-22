var express = require('express');
var request = require('request')

var app=express();

app.get('/jira/*',function (req,res) {
	request('https://obujira.searshc.com'+req.originalUrl).pipe(res);
})

app.use(express.static('public'));

app.listen(8000,function () {
	console.log('server listening at port 8000');
});
