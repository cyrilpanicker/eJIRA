var config;

var isTeamMember = function (member) {
	var teamMember = false;
	for (var i = config.team.length - 1; i >= 0; i--) {
		if (member.toUpperCase().indexOf(config.team[i].toUpperCase()) > -1) {
			teamMember = true;
		}
	};
	return teamMember;
};

var addDays=function(date, days) {
	var result = date;
	result.setDate(date.getDate() + days);
	return result;
};

var getDateDiff = function (date1,date2) {
	var difference = {};
	difference.overdue = false;

	if (date2 > date1) {
		difference.overdue = true;
		var temp = date1;
		date1 = date2;
		date2 = temp;
	}

	var diffInMilliSecs = date1 - date2;

	difference.days = Math.floor(diffInMilliSecs / 86400000);
	difference.signedDays = difference.overdue ? -(difference.days) : difference.days;
	diffInMilliSecs -= difference.days * 86400000;

	difference.hours = Math.floor(diffInMilliSecs / 3600000);
	diffInMilliSecs -= difference.hours * 3600000;

	difference.minutes = Math.floor(diffInMilliSecs / 60000);

	return difference;
};

var getProcessedJiraList = function (list) {
	var processedList = [];

	for (var i = 0; i < list.length; i++) {

		var created='', assigned='', lastWorked='';
		processedList[i] = {};

		//id, summary, status, eta, sub-project
		processedList[i].id = list[i].key;
		processedList[i].summary = list[i].fields.summary;
		processedList[i].status = list[i].fields.status.name;
		processedList[i].eta = list[i].fields.customfield_10143;
		processedList[i].subProject = list[i].fields.customfield_10024.value;

		//created
		created = new Date(Date.parse(list[i].fields.created));
		processedList[i].created = created.toLocaleString();


		//priority
		for (var j = list[i].fields.labels.length - 1; j >= 0; j--) {
			if (list[i].fields.labels[j] == 'Business_Priority') {
				processedList[i].priority = 'BP';
				break;
			};
		};
		if (!processedList[i].priority) {
			processedList[i].priority = list[i].fields.priority.name;
		};

		//assignee
		processedList[i].assignee = {};
		processedList[i].assignee.name = list[i].fields.assignee.displayName;
		processedList[i].assignee.userName = list[i].fields.assignee.name;

		//components
		processedList[i].components = [];
		for (var j = 0; j < list[i].fields.components.length; j++) {
			processedList[i].components.push(list[i].fields.components[j].name);
		};


		//assigned
		assignedLoop :
		for (var j = 0; j < list[i].changelog.histories.length; j++) {
			for (var k = list[i].changelog.histories[j].items.length - 1; k >= 0; k--) {
				if (list[i].changelog.histories[j].items[k].field == 'assignee') {
					for (var l = config.team.length - 1; l >= 0; l--) {
						if (list[i].changelog.histories[j].items[k].to && list[i].changelog.histories[j].items[k].to.toUpperCase().indexOf(config.team[l].toUpperCase()) > -1) {
							assigned = new Date(Date.parse(list[i].changelog.histories[j].created));
							break assignedLoop;
						};
					};
				};
			};
		};
		if (!assigned) {
			assigned = created;
		};
		processedList[i].assigned = assigned.toLocaleString();


		//last-worked
		lastWorkedLoop : 
		for (var j = list[i].fields.comment.comments.length - 1; j >= 0; j--) {
			for (var k = config.team.length - 1; k >= 0; k--) {
				if (list[i].fields.comment.comments[j].author.name.toUpperCase().indexOf(config.team[k].toUpperCase()) > -1) {
					lastWorked = new Date(Date.parse(list[i].fields.comment.comments[j].created));
					break lastWorkedLoop;
				};
			};
		};
		if (!lastWorked) {
			lastWorked = assigned;
		};
		processedList[i].lastWorked = lastWorked.toLocaleString();

		//idleSince
		processedList[i].idleSince = Math.floor(((new Date()).getTime() - lastWorked.getTime())/86400000);

		if (config.sla[processedList[i].priority]) {

			//slaDueDate
			slaDueDate = addDays(created,config.sla[processedList[i].priority]);
			processedList[i].slaDueDate = slaDueDate.toLocaleString();

			//slaDueIn
			processedList[i].slaDueIn = getDateDiff(slaDueDate,new Date());
		}

		//comments
		processedList[i].comments = [];
		for (var j = 0; j < list[i].fields.comment.comments.length; j++) {
			processedList[i].comments.push({
				author : list[i].fields.comment.comments[j].author.displayName,
				date : new Date(Date.parse(list[i].fields.comment.comments[j].created)).toLocaleString(),
				text : list[i].fields.comment.comments[j].body
			});
		};

		//assignments
		processedList[i].assignments = [];
		var assignedDate;
		for (var j = 0; j < list[i].changelog.histories.length; j++) {
			for (var k = 0; k < list[i].changelog.histories[j].items.length; k++) {
				if (list[i].changelog.histories[j].items[k].field == 'assignee') {
					assignedDate = new Date(Date.parse(list[i].changelog.histories[j].created));
					if (!processedList[i].assignments.length) {
						processedList[i].assignments.push({
							start:processedList[i].created,
							end:assignedDate.toLocaleString(),
							assigneeName:list[i].changelog.histories[j].items[k].fromString,
							assignee:list[i].changelog.histories[j].items[k].from
						});
					} else {
						processedList[i].assignments[processedList[i].assignments.length-1]['end'] = assignedDate.toLocaleString();
					}
					processedList[i].assignments.push({
						start:assignedDate.toLocaleString(),
						assigneeName:list[i].changelog.histories[j].items[k].toString,
						assignee:list[i].changelog.histories[j].items[k].to
					});
				}
			};
		};
		if (processedList[i].assignments.length) {
			processedList[i].assignments[processedList[i].assignments.length-1]['end'] = new Date().toLocaleString();
		} else {
			processedList[i].assignments.push({
				start:processedList[i].created,
				end:new Date().toLocaleString(),
				assignee:processedList[i].assignee.userName,
				assigneeName:processedList[i].assignee.name
			});
		};

		//assignmentsToOurTeam
		//assignmentsToOtherTeams
		processedList[i].assignmentsToOurTeam = [];
		processedList[i].assignmentsToOtherTeams = [];
		var jiraWithOurTeam = false, jiraWithOtherTeam = false;
		for (var j = 0; j < processedList[i].assignments.length; j++) {
			if (processedList[i].assignments[j].assignee) {
				if (isTeamMember(processedList[i].assignments[j].assignee) && !jiraWithOurTeam) {
					processedList[i].assignmentsToOurTeam.push({
						date:processedList[i].assignments[j].start
					});
					jiraWithOurTeam = true;
					jiraWithOtherTeam = false;
				} else if (!isTeamMember(processedList[i].assignments[j].assignee) && !jiraWithOtherTeam) {
					processedList[i].assignmentsToOtherTeams.push({
						date:processedList[i].assignments[j].start
					});
					jiraWithOurTeam = false;
					jiraWithOtherTeam = true;
				}
			} else if (!jiraWithOtherTeam) {
				processedList[i].assignmentsToOtherTeams.push({
					date:processedList[i].assignments[j].start
				});
				jiraWithOurTeam = false;
				jiraWithOtherTeam = true;
			} 
		};
	};


	return processedList;
};

var getProcessedMinimalJiraList = function (list) {
	var minimalList=[];
	for (var i = list.length - 1; i >= 0; i--) {
		minimalList[i] = {};
		minimalList[i].id = list[i].id;
		minimalList[i].status = list[i].status;
		minimalList[i].priority = list[i].priority;
		minimalList[i].assignee = {};
		minimalList[i].assignee.name = list[i].assignee.name;
		minimalList[i].assignee.userName = list[i].assignee.userName;
		minimalList[i].component = list[i].components[0];
		minimalList[i].idleSince = list[i].idleSince;
		if (list[i].slaDueIn) {
			minimalList[i].slaDueIn = list[i].slaDueIn.signedDays;
		}
	};
	return minimalList;
};

module.exports = function (context) {

	config = context.config;

	return{
		getProcessedJiraList : getProcessedJiraList,
		getProcessedMinimalJiraList : getProcessedMinimalJiraList
	};
};