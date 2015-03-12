var express = require('express');
var jiraService = require('./jiraService');
var Promise = require('bluebird');
var app=express();
var server;

var server = app.listen(8000,function () {
	console.log('server listening at port 8000');
});

var io = require('socket.io')(server);

app.use(express.static('public'));

var processedJiraList = [];
var processedMinimalJiraList = [];
var lastUpdated;

// app.get('/jiras',function (req,res) {
// 	res.send({
// 		lastUpdated : lastUpdated,
// 		list : processedMinimalJiraList
// 	});
// });

io.on('connection',function (socket) {
	socket.emit('listUpdated',{
		lastUpdated : lastUpdated,
		list : processedMinimalJiraList
	});
	socket.on('jiraSelected',function (jira) {
		for (var i = processedJiraList.length - 1; i >= 0; i--) {
			if (processedJiraList[i].id == jira.id) {
				socket.emit('jiraSelectedDetails',processedJiraList[i]);
				break;
			} else {
				
			} 
		};
	});
});

var getMinimalList = function (list) {
	var minimalList=[];
	for (var i = list.length - 1; i >= 0; i--) {
		minimalList[i] = {};
		minimalList[i].id = list[i].id;
		minimalList[i].status = list[i].status;
		minimalList[i].priority = list[i].priority;
		minimalList[i].assignee = list[i].assignee.name;
		minimalList[i].component = list[i].components[0];
		minimalList[i].daysSinceLastWorked = list[i].daysSinceLastWorked;
	};
	return minimalList;
};

var delayFiveMins = function () {
	return new Promise(function (resolve,reject) {
		setTimeout(function () {
			resolve();
		},300000);
	});
};

(function loopJiraFetch () {
	console.time('jiras fetched');
	jiraService.getAllJiras()
	.then(function(list){
		processedJiraList = jiraService.processList(list);
		processedMinimalJiraList = getMinimalList(processedJiraList);
		console.timeEnd('jiras fetched');
		lastUpdated = new Date();
		io.emit('listUpdated',{
			lastUpdated : lastUpdated,
			list : processedMinimalJiraList
		});
		return delayFiveMins();
	},function(errorResponse){
		reject(errorResponse);
	})
	.then(function(response){
		loopJiraFetch();
	});
})();