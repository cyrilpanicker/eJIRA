var express = require('express');
var config = require('./config.json');
var events = require('events');

var isTestRun = false;

for (var i = process.argv.length - 1; i >= 0; i--) {
	if (process.argv[i].toLowerCase().indexOf('test') > -1) {
		isTestRun = true;
		break;
	};
};

var app=express();
app.use(express.static('public'));

var server = app.listen(config.server.port,function () {
	console.log('server listening at port '+config.server.port);
});

var io = require('socket.io')(server);
var eventEmitter = new events.EventEmitter();

var modules = [
	'./jiraFetcher',
	'./socketApi',
	'./eventApi',
	'./authenticationApi',
	'./restApi',
];

var context = {
	config : config,
	app : app,
	io : io,
	eventEmitter : eventEmitter,
	isTestRun : isTestRun,
	jiraFetchInfo : {
		update : {
			processedMinimalList : [],
			listLastUpdated : null,
			listFetchedIn : null
		},
		processedList : []
	}
};

for (var i = 0; i < modules.length; i++) {
	require(modules[i])(context);
};