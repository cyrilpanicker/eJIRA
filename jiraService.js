var request = require('request');
var Promise = require('bluebird');
var config=require('./JQLConfig.json');

var milliSecsInADay = 86400000;

var allJiraQuery = "Project = SG AND Type = Bug AND 'Defect Environment' = Production AND Status not in (Resolved, Verified, Closed) AND assignee in (USP_SAL_IRS_SUPPORT, USP_UC_UP_SUPPORT, ShopSears_Support, MobileAppSupport, danand1, mmohan1, aatla0, bsingh6, PTHANKA, amuthiy, RDEV1, rasthan, bdutta0, MKUMAR5, rveedu, abaner2, DPANT, ddevara, rmeena, abhatt1, skandiy, akalimu, gsundha, mmohan2, pmancha, srajesw, ntreesa, pwilso4, smishr0, amanog0, Kpalan0, srajama, schand3, vmuthus, nmathe1, kramakr, rjacob0, rthanka, vvenka2, rthanka, ssiraju, nthom18, aabrah8, vmeruva) AND ('Sub Project' in ('ShopSears 2.5', 'ShopSears2.5', 'ShopSears 2.5_Lite', 'Production Defects') OR 'Sub Project' in ('ShopSears 2.0', 'ShopSears Lite_UC', 'ShopSears 2.5', 'ShopSears2.5', 'ShopSears 2.5_Lite', 'Production Defects', 'Mobile 6.x', 'Core Mobile Services', 'Service Abstraction Layer', FindItCenter, 'In Store Kiosk') AND component in (USP_VAULT, USP_URS, USP_UAS, USP_SAL, USP_UC, USP_UPAS, USP_OMS, 'Print Receipt', USP_UP, USP_PV, USP_SAL_Cart, USP_Shipping, RDM, USP_IRS))";
var team = ['USP_SAL_IRS_SUPPORT','USP_UC_UP_SUPPORT','ShopSears_Support','MobileAppSupport','danand1','mmohan1','aatla0','bsingh6','PTHANKA','amuthiy','RDEV1','rasthan','bdutta0','MKUMAR5','rveedu','abaner2','DPANT','ddevara','rmeena','abhatt1','skandiy','akalimu','gsundha','mmohan2','pmancha','srajesw','ntreesa','pwilso4','smishr0','amanog0','Kpalan0','srajama','schand3','vmuthus','nmathe1','kramakr','rjacob0','rthanka','vvenka2','rthanka','ssiraju','nthom18','aabrah8','vmeruva'];
var orderByClause = ' ORDER BY priority DESC, createdDate ASC';

var getJiraCount = function () {
	return new Promise(function (resolve,reject) {
		request({
			method:'GET',
			useQuerystring:true,
			uri:'https://obujira.searshc.com/jira/rest/api/2/search',
			qs:{
				fields:["key"],
				startAt:0,
				maxResults:1,
				jql:config.priorityClause + allJiraQuery + orderByClause
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
			uri:'https://obujira.searshc.com/jira/rest/api/2/search',
			qs:{
				fields:["key","summary","priority","assignee","status","created","customfield_10143","components","labels","customfield_10024","comment"],
				startAt:(options && options.startAt) || 0,
				maxResults:(options && options.maxResults) || 1,
				jql:config.priorityClause + allJiraQuery + orderByClause,
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

var processList = function (list) {
	var processedList = [];
	for (var i = 0; i < list.length; i++) {
		processedList[i] = {};
		processedList[i].id = list[i].key;
		processedList[i].summary = list[i].fields.summary;
		processedList[i].status = list[i].fields.status.name;
		processedList[i].created = new Date(Date.parse(list[i].fields.created));
		processedList[i].eta = list[i].fields.customfield_10143;
		processedList[i].subProject = list[i].fields.customfield_10024.value;
		for (var j = list[i].fields.labels.length - 1; j >= 0; j--) {
			if (list[i].fields.labels[j] == 'Business_Priority') {
				processedList[i].priority = 'BP';
				break;
			};
		};
		if (!processedList[i].priority) {
			processedList[i].priority = list[i].fields.priority.name;
		};
		processedList[i].assignee = {};
		processedList[i].assignee.name = list[i].fields.assignee.displayName;
		processedList[i].assignee.userName = list[i].fields.assignee.name;
		processedList[i].components = [];
		for (var j = 0; j < list[i].fields.components.length; j++) {
			processedList[i].components.push(list[i].fields.components[j].name);
		};
		for (var j = list[i].fields.comment.comments.length - 1; j >= 0; j--) {
			for (var k = team.length - 1; k >= 0; k--) {
				if (list[i].fields.comment.comments[j].author.name.toUpperCase().indexOf(team[k].toUpperCase()) > -1) {
					processedList[i].lastComment = list[i].fields.comment.comments[j].body;
					processedList[i].lastCommentedTeamMember = list[i].fields.comment.comments[j].author.displayName;
					processedList[i].lastWorked = new Date(Date.parse(list[i].fields.comment.comments[j].created));
					break;
				};
			};
			if (processedList[i].lastWorked) {
				break;
			};
		};
		if (!processedList[i].lastWorked) {
			processedList[i].lastWorked = processedList[i].created;
		};
		processedList[i].daysSinceLastWorked = Math.floor(((new Date()).getTime() - processedList[i].lastWorked.getTime())/86400000);
		for (var j = 0; j < list[i].changelog.histories.length; j++) {
			for (var k = list[i].changelog.histories[j].items.length - 1; k >= 0; k--) {
				if (list[i].changelog.histories[j].items[k].field == 'assignee') {
					for (var l = team.length - 1; l >= 0; l--) {
						if (list[i].changelog.histories[j].items[k].to && list[i].changelog.histories[j].items[k].to.toUpperCase().indexOf(team[l].toUpperCase()) > -1) {
							processedList[i].assigned = new Date(Date.parse(list[i].changelog.histories[j].created));
							break;
						};
					};
				};
				if (processedList[i].assigned) {
					break;
				};
			};
			if (processedList[i].assigned) {
				break;
			};
		};
		if (!processedList[i].assigned) {
			processedList[i].assigned = processedList[i].created;
		};
	};
	return processedList;
};

module.exports={
	getJiraCount:getJiraCount,
	getJiras:getJiras,
	getAllJiras:getAllJiras,
	processList:processList
};

// var getCompactList = function (jiras) {
// 	var result = [];
// 	for (var i = 0; i < jiras.length; i++) {
// 		result[i]={};
// 		result[i].key = jiras[i].key;
// 		result[i].id = jiras[i].id;
// 		result[i].summary = jiras[i].fields.summary;
// 		result[i].status = jiras[i].fields.status.name;
// 		result[i].created = jiras[i].fields.created;
// 		result[i].updated = jiras[i].fields.updated;
// 		result[i].eta = jiras[i].fields.customfield_10143;
// 		result[i].priority = jiras[i].fields.priority.name;
// 		result[i].labels = jiras[i].fields.labels;
// 		result[i].assignee = {};
// 		result[i].assignee.name = jiras[i].fields.assignee.displayName;
// 		result[i].assignee.userName = jiras[i].fields.assignee.name;
// 		result[i].subProject = jiras[i].fields.customfield_10024.value;
// 		result[i].components=[];
// 		for (var j = jiras[i].fields.components.length - 1; j >= 0; j--) {
// 			result[i].components.push(jiras[i].fields.components[j].name);
// 		};
// 	};
// 	return result;
// };

// var getLastComment = function (jiraId) {
// 	var comments;
// 	return new Promise(function (resolve,reject) {
// 		request({
// 			method:'GET',
// 			uri:'https://obujira.searshc.com/jira/rest/api/2/issue/'+jiraId+'/comment',
// 		},function (error,response,body) {
// 			if (error) {
// 				reject(error);
// 			} else {
// 				comments = JSON.parse(body).comments;
// 				resolve(comments[comments.length - 1]);
// 			}
// 		});
// 	});
// };

// var getDaysSinceLastComment = function (comment) {
// 	return Math.floor((new Date().getTime() - new Date(Date.parse(comment.created)).getTime()) / milliSecsInADay);
// };
