var request = require('request');
var Promise = require('bluebird');

var allJiraQuery, searchUri;

var milliSecsInADay = 86400000;

var getJiraCount = function () {
	return new Promise(function (resolve,reject) {
		request({
			method:'GET',
			useQuerystring:true,
			uri:searchUri,
			qs:{
				fields:["key"],
				startAt:0,
				maxResults:1,
				jql:allJiraQuery
			}
		},function (error,response,body) {
			if (error) {
				reject(error);
			} else {
				resolve(JSON.parse(body).total);
			}
		});
	});
};

var getJiras = function (options) {
	return new Promise(function (resolve,reject) {
		request({
			method:'GET',
			useQuerystring:true,
			uri:searchUri,
			qs:{
				fields:["key","summary","priority","assignee","status","created","customfield_10143","components","labels","customfield_10024","comment"],
				startAt:(options && options.startAt) || 0,
				maxResults:(options && options.maxResults) || 1,
				jql:allJiraQuery,
				expand:'changelog'
			}
		},function (error,response,body) {
			if (error) {
				reject(error);
			} else {
				resolve(JSON.parse(body).issues);
			}
		});
	});
};

var getAllJiras = function () {

	var batchSize = 50;
	var turns;
	var startAt = 0;
	var _jiras = [];
	var jiras = [];
	var jirasFetchedPromise;
	var allJirasFetchedPromise = [];

	return getJiraCount()
	.then(function(count){
		return Promise.resolve(count);
	},function(errorResponse){
		return Promise.reject(errorResponse);
	})
	.then(function(count){
		turns = Math.ceil(count / batchSize);
		for (var i = 0; i < turns; i++) {
			(function (i) {
				jirasFetchedPromise = getJiras({startAt:startAt, maxResults:batchSize})
				.then(function(issues){
					_jiras[i] = issues;
				},function(errorResponse){
					return Promise.reject(errorResponse);
				});
				allJirasFetchedPromise.push(jirasFetchedPromise);
				startAt += batchSize;
			})(i);
		};
		return Promise.all(allJirasFetchedPromise);
	},function(errorResponse){
		return Promise.reject(errorResponse);
	}).then(function(response){
		for (var i = 0; i < _jiras.length; i++) {
			jiras = jiras.concat(_jiras[i]);
		};
		return Promise.resolve(jiras);
	},function(errorResponse){
		return Promise.reject(errorResponse);
	});
};

module.exports = function (context) {

	config = context.config;

	allJiraQuery = 'assignee in ('+config.team.join(',')+')'
	+' AND '+config.query
	+' AND Priority in ('+config.priorities.join(',')+')';

	searchUri = config.jiraServer + config.searchApi;

	return {
		getAllJiras:getAllJiras
	};

};