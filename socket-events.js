var testJiraService = require('./testJiraService');
var jiraService = require('./jiraService');
var processedJiraList = [];
var processedMinimalJiraList = [];
var lastUpdated;

var fetchedInStart, fetchedInEnd, fetchedIn;
var delayStart, delayEnd, delay;

var delayFiveMins = function () {
	return new Promise(function (resolve,reject) {
		setTimeout(function () {
			resolve();
		},300000);
	});
};

var delayTwoMins = function () {
	return new Promise(function (resolve,reject) {
		setTimeout(function () {
			resolve();
		},120000);
	});
};

module.exports = function (server,useTestData) {

	var io = require('socket.io')(server);

	io.on('connection',function (socket) {
		socket.emit('listUpdated',{
			lastUpdated : lastUpdated,
			list : processedMinimalJiraList,
			fetchedIn : fetchedIn
		});
		socket.on('jiraSelected',function (jira) {
			var jiraFound = false;
			for (var i = processedJiraList.length - 1; i >= 0; i--) {
				if (processedJiraList[i].id == jira.id) {
					socket.emit('jiraSelectedDetails',processedJiraList[i]);
					jiraFound = true;
					break;
				}
			};
			if (!jiraFound) {
				console.log('details were not found for the selected jira');
				socket.emit('jiraSelectedDetails',null);
			} 
		});
	});

	console.log('fetching jiras');

	(function loopJiraFetch () {
		fetchedInStart = new Date().getTime();
		testJiraService.getAllJiras()
		.then(function(list){
			processedJiraList = jiraService.processList(list);
			processedMinimalJiraList = jiraService.getMinimalList(processedJiraList);
			lastUpdated = new Date();
			fetchedInEnd = lastUpdated.getTime();
			fetchedIn = fetchedInEnd - fetchedInStart;
			console.log('jiras fetched in '+Math.round((fetchedIn/1000/60)*100)/100+' min');
			io.emit('listUpdated',{
				lastUpdated : lastUpdated,
				list : processedMinimalJiraList,
				fetchedIn : fetchedIn
			});
			delayStart = new Date().getTime();
			return delayFiveMins();
		},function(errorResponse){
			io.emit('errorFetchingJiras',errorResponse);
			console.log('error occured while fetching jiras');
			console.log(errorResponse);
			delayStart = new Date().getTime();
			return delayTwoMins();
		})
		.then(function(response){
			delayEnd = new Date().getTime();
			delay = delayEnd - delayStart;
			console.log('fetching jiras after delay of '+Math.round((delay/1000/60)*100)/100+' min');
			io.emit('fetchingJiras',{
				delay:delay
			});
			loopJiraFetch();
		});
	})();

};