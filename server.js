var express = require('express');
var config = require('./config.json');
var events = require('events');

var isTestRun = true;

var app=express();
app.use(express.static('public'));

var server = app.listen(config.server.port,function () {
	console.log('server listening at port '+config.server.port);
});

var io = require('socket.io')(server);
var eventEmitter = new events.EventEmitter();

var modules = [
	'./jira-fetcher',
	'./socket-api',
	'./event-api',
	'./authentication-api',
	'./rest-api',
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