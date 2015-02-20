var express = require('express');

var app=express();

app.get('/jira/*',function (req,res) {
	request('http://public-api.wordpress.com/'+req.originalUrl.slice(6)).pipe(res);
})

app.use(express.static('public'));

app.listen(8000,function () {
	console.log('server listening at port 8000');
});