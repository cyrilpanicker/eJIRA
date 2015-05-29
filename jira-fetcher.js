var Promise = require('bluebird');
var eventEmitter,
fetchedInStart, fetchedInEnd,
delay, delayStart, delayEnd;

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

var loopJiraFetch = function (context,jiraService,helper) {

	if (!eventEmitter) {
		eventEmitter = context.eventEmitter;
	};

	fetchedInStart = new Date().getTime();

	jiraService.getAllJiras()
	.then(function(list){

		context.jiraFetchInfo.update.listLastUpdated = new Date();

		fetchedInEnd = context.jiraFetchInfo.update.listLastUpdated.getTime();
		context.jiraFetchInfo.update.listFetchedIn = fetchedInEnd - fetchedInStart;

		context.jiraFetchInfo.processedList = helper.getProcessedJiraList(list);

		context.jiraFetchInfo.update.processedMinimalList = helper.getProcessedMinimalJiraList(context.jiraFetchInfo.processedList);

		eventEmitter.emit('listUpdated');
		console.log('jiras fetched in '+Math.round((context.jiraFetchInfo.update.listFetchedIn/1000/60)*100)/100+' min');
		
		delayStart = new Date().getTime();
		return delayFiveMins();

	},function(errorResponse){

		eventEmitter.emit('errorFetchingJiras',errorResponse);
		console.log('error occured while fetching jiras');
		console.log(errorResponse);

		delayStart = new Date().getTime();
		return delayTwoMins();

	})
	.then(function(response){

		delayEnd = new Date().getTime();
		delay = delayEnd - delayStart;

		console.log('fetching jiras after delay of '+Math.round((delay/1000/60)*100)/100+' min');
		eventEmitter.emit('fetchingJiras',delay);

		loopJiraFetch(context,jiraService,helper);

	});
};

module.exports = function (context) {
	var helper = require('./jiraHelperService')(context);
	var jiraService;

	if (context.isTestRun) {
		jiraService = require('./testJiraService');
	} else{
		jiraService = require('./jiraService')(context);
	};

	console.log('fetching jiras');
	loopJiraFetch(context,jiraService,helper);
};
