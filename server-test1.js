var express = require('express');
var app=express();

app.use(express.static('public'));
var server = app.listen(8000,function () {
	console.log('server listening at port 8000');
});

require('./testAuthentication.js')(app);
require('./socket-events.js')(server,useTestData);
