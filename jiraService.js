var sample = require('./out.json');
var Promise = require('bluebird');

var milliSecsInADay = 86400000;

var team = ['USP_SAL_IRS_SUPPORT','USP_UC_UP_SUPPORT','ShopSears_Support','MobileAppSupport','danand1','mmohan1','aatla0','bsingh6','PTHANKA','amuthiy','RDEV1','rasthan','bdutta0','MKUMAR5','rveedu','abaner2','DPANT','ddevara','rmeena','abhatt1','skandiy','akalimu','gsundha','mmohan2','pmancha','srajesw','ntreesa','pwilso4','smishr0','amanog0','Kpalan0','srajama','schand3','vmuthus','nmathe1','kramakr','rjacob0','rthanka','vvenka2','rthanka','ssiraju','nthom18','aabrah8','vmeruva'];

var getAllJiras = function() {
	return new Promise(function (resolve,reject) {
		resolve(sample.issues);
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
	getAllJiras:getAllJiras,
	processList:processList
};