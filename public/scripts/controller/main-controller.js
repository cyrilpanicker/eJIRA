angular.module('app', ['ui.bootstrap','isteven-multi-select','destegabry.timeline','angular-loading-bar'])
.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
	cfpLoadingBarProvider.includeSpinner = false;
}])
.factory('socket', function ($rootScope) {
	var socket = io.connect();
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () { 
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		emit: function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		}
	};
})
.factory('restService', ['$http', function ($http) {
	var service = {};
	service.login = function (user) {
		return $http({
			method:'POST',
			url:'/login',
			data:user
		});
	};
	service.logout = function () {
		return $http({
			method:'POST',
			url:'/logout'
		});
	};
	service.getUser=function () {
		return $http({
			method:'GET',
			url:'/user'
		});
	};
	service.getJiraDetails=function (id) {
		return $http({
			method:'GET',
			url:'/jira',
			params:{
				id:id
			}
		});
	};
	return service;
}])
.controller('JiraController', ['$scope','$interval','$modal','socket','restService', function ($scope,$interval,$modal,socket,restService) {
	
	var loginModal;
	
	$scope.user = {};
	$scope.formUser={};
	$scope.list = [];
	$scope.filteredList = [];
	$scope.paginatedList = [];
	$scope.selectedJira = {};
	$scope.assignees = [];
	$scope.priorities = [];
	$scope.statuses = [];
	$scope.components = [];
	$scope.conditions = [
	{
		sign:'=',
		value:'equals'
	},{
		sign:'<=',
		value:'lessThanEquals'
	},{
		sign:'>=',
		value:'greaterThanEquals'
	}
	];
	$scope.filters={
		issue:'',
		assignees:[],
		priorities:[],
		idleSinceSign:$scope.conditions[2].value,
		idleSince:0,
		slaDueInSign:$scope.conditions[1].value,
		slaDueIn:7,
		statuses:[],
		components:[]
	};
	
	$scope.translation = {
		selectNone : "Remove Filter",
		search : "Search...",
		nothingSelected : "Apply Filter"
	};
	
	$scope.lastUpdatedInMinAgo = 0;

	$scope.timelineModalVariables = {};
	$scope.timelineModalVariables.includeCommentsInTimeline = false;
	
	restService.getUser()
	.then(function (response){
		$scope.user = response.data;
	},function (errorResponse){
		
	});
	
	socket.on('listUpdated',function (response) {
		console.log('jiras fetched in '+Math.round(response.listFetchedIn/1000/60*100)/100+' min');
		$scope.list = response.processedMinimalList;
		$scope.lastUpdated = new Date(response.listLastUpdated);
		$scope.lastUpdatedInMinAgo = getTimeDiffInMin($scope.listLastUpdated);
		updateDropDowns();
		$scope.updateFilteredList();
	});

	$scope.$watch('timelineModalVariables.includeCommentsInTimeline', function() {
		if ($scope.selectedJira.assignments) {
			$scope.timelineEvents = getTimelineEvents($scope.timelineModalVariables.includeCommentsInTimeline);
		}
	});

	var getTimelineEvents = function (includeComments) {
		var events = [];
		for (var i = $scope.selectedJira.assignments.length - 1; i >= 0; i--) {
			var _event = {};
			_event.content = $scope.selectedJira.assignments[i].assigneeName;
			_event.start = new Date(Date.parse($scope.selectedJira.assignments[i].start));
			_event.end = new Date(Date.parse($scope.selectedJira.assignments[i].end));
			events.push(_event);
		};

		if (includeComments) {
			for (var i = $scope.selectedJira.comments.length - 1; i >= 0; i--) {
				events.push({
					start:new Date(Date.parse($scope.selectedJira.comments[i].date)),
					content: $scope.selectedJira.comments[i].author,
					className:'yellowEvent',
					type:'box'
				});
			};
		} 

		for (var i = $scope.selectedJira.assignmentsToOurTeam.length - 1; i >= 0; i--) {
			events.push({
				start:new Date(Date.parse($scope.selectedJira.assignmentsToOurTeam[i].date)),
				content: 'Assigned to our team',
				className:'redEvent'
			});
		};
		for (var i = $scope.selectedJira.assignmentsToOtherTeams.length - 1; i >= 0; i--) {
			events.push({
				start:new Date(Date.parse($scope.selectedJira.assignmentsToOtherTeams[i].date)),
				content: 'Assigned to another team',
				className:'redEvent'
			});
		};
		events.push({
			content:'Created',
			start:new Date(Date.parse($scope.selectedJira.created)),
			className:'redEvent'
		});
		if ($scope.selectedJira.slaDueIn) {
			if ($scope.selectedJira.slaDueIn.overdue) {
				events.push({
					content:'SLA Expired',
					start:new Date(Date.parse($scope.selectedJira.slaDueDate)),
					className:'redEvent'
				});
			} else {
				events.push({
					content:'SLA Expires',
					start:new Date(Date.parse($scope.selectedJira.slaDueDate)),
					className:'redEvent'
				});
			}
		}
		return events
	};

	$scope.selectedEvent = {};
	
	socket.on('errorFetchingJiras',function (error) {
		console.log('error occured while fetching jiras');
		console.log(error);
	});
	
	socket.on('fetchingJiras',function (response) {
		console.log('fetching jiras after delay of '+Math.round(response.delay/1000/60*100)/100+' min');
	});
	
	var updatePaginatedList = function (page) {
		if(!page){
			page = 1;
		}
		var begin = (page - 1) * 10;
		var end = begin + 10;
		$scope.paginatedList = $scope.filteredList.slice(begin,end);
		$scope.paginatedList.currentPage = page;
		$scope.paginatedList.begin = begin;
		if ($scope.paginatedList.length < 10) {
			$scope.paginatedList.end = begin + $scope.paginatedList.length;
		} else {
			$scope.paginatedList.end = end;
		}
	};
	
	$scope.updateFilteredList = function () {
		$scope.filteredList = $scope.list;
		if ($scope.filters.issue) {
			$scope.filteredList = filterById($scope.filteredList,$scope.filters.issue);
		};
		if ($scope.filters.assignees.length) {
			$scope.filteredList = filterByAssignees($scope.filteredList,$scope.filters.assignees);
		};
		if ($scope.filters.priorities.length) {
			$scope.filteredList = filterByPriorities($scope.filteredList,$scope.filters.priorities);
		};
		if (angular.isNumber($scope.filters.idleSince)) {
			$scope.filteredList = filterByIdleSince($scope.filteredList,$scope.filters.idleSince,$scope.filters.idleSinceSign);
		};
		if (angular.isNumber($scope.filters.slaDueIn)) {
			$scope.filteredList = filterBySlaDueIn($scope.filteredList,$scope.filters.slaDueIn,$scope.filters.slaDueInSign);
		};
		if ($scope.filters.statuses.length) {
			$scope.filteredList = filterByStatuses($scope.filteredList,$scope.filters.statuses);
		};
		// if ($scope.filters.components.length) {
		// 	$scope.filteredList = filterByComponents($scope.filteredList,$scope.filters.components);
		// };
		updatePaginatedList();
	};
	
	$scope.$watch('filters', $scope.updateFilteredList, true);
	$scope.$watch('paginatedList.currentPage', updatePaginatedList);
	
	var updateDropDowns = function () {
		$scope.assignees = [];
		$scope.priorities = [];
		$scope.statuses = [];
		// $scope.components = [];
		var assignees = getUniquePropertyValues($scope.list,'assignee');
		var priorities = getUniquePropertyValues($scope.list,'priority');
		var statuses = getUniquePropertyValues($scope.list,'status');
		// var components = getUniquePropertyValues($scope.list,'component');
		for (var i = assignees.length - 1; i >= 0; i--) {
			$scope.assignees.push({name:assignees[i],selected:false});
		};
		for (var i = priorities.length - 1; i >= 0; i--) {
			$scope.priorities.push({name:priorities[i],selected:false});
		};
		for (var i = statuses.length - 1; i >= 0; i--) {
			$scope.statuses.push({name:statuses[i],selected:false});
		};
		// for (var i = components.length - 1; i >= 0; i--) {
		// 	$scope.components.push({name:components[i],selected:false});
		// };
	};
	
	var getUniquePropertyValues = function (list,propertyName) {
		var propertyValues = [];
		for (var i = list.length - 1; i >= 0; i--) {
			var propertyValue = list[i][propertyName];
			var propertyValueFound = false;
			for (var j = propertyValues.length - 1; j >= 0; j--) {
				if (propertyValue == propertyValues[j]) {
					propertyValueFound = true;
					break;
				}
			};
			if (!propertyValueFound) {
				propertyValues.push(propertyValue);
			};
		};
		return propertyValues;
	};
	
	var filterById = function (list,pattern) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			var id = list[i].id.replace('-','');
			pattern = pattern.replace('-','');
			if (id.toUpperCase().match(pattern.toUpperCase())) {
				filteredList.push(list[i]);
			};
		};
		return filteredList;
	};
	
	var filterByAssignees = function (list,assignees) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			for (var j = assignees.length - 1; j >= 0; j--) {
				if (list[i].assignee == assignees[j].name) {
					filteredList.push(list[i]);
					break;
				};
			};
		};
		return filteredList;
	};
	
	var filterByPriorities = function (list,priorities) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			for (var j = priorities.length - 1; j >= 0; j--) {
				if (list[i].priority == priorities[j].name) {
					filteredList.push(list[i]);
					break;
				};
			};
		};
		return filteredList;
	};
	
	var filterByStatuses = function (list,statuses) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			for (var j = statuses.length - 1; j >= 0; j--) {
				if (list[i].status == statuses[j].name) {
					filteredList.push(list[i]);
					break;
				};
			};
		};
		return filteredList;
	};
	
	var filterByComponents = function (list,components) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			for (var j = components.length - 1; j >= 0; j--) {
				if (list[i].component == components[j].name) {
					filteredList.push(list[i]);
					break;
				};
			};
		};
		return filteredList;
	};
	
	var filterByIdleSince = function(list,days,sign) {
		var filteredList = [];
		switch(sign){
			case 'equals':
			for (var i = 0; i < list.length; i++) {
				if (list[i].idleSince == days) {
					filteredList.push(list[i]);
				};
			};
			break;
			case 'lessThanEquals':
			for (var i = 0; i < list.length; i++) {
				if (list[i].idleSince <= days) {
					filteredList.push(list[i]);
				};
			};
			break;
			case 'greaterThanEquals':
			for (var i = 0; i < list.length; i++) {
				if (list[i].idleSince >= days) {
					filteredList.push(list[i]);
				};
			};
			break;
		}
		return filteredList;
	};

	var filterBySlaDueIn = function(list,days,sign) {
		var filteredList = [];
		switch(sign){
			case 'equals':
			for (var i = 0; i < list.length; i++) {
				if (list[i].slaDueIn && list[i].slaDueIn == days) {
					filteredList.push(list[i]);
				};
			};
			break;
			case 'lessThanEquals':
			for (var i = 0; i < list.length; i++) {
				if (list[i].slaDueIn && list[i].slaDueIn <= days) {
					filteredList.push(list[i]);
				};
			};
			break;
			case 'greaterThanEquals':
			for (var i = 0; i < list.length; i++) {
				if (list[i].slaDueIn && list[i].slaDueIn >= days) {
					filteredList.push(list[i]);
				};
			};
			break;
		}
		return filteredList;
	};
	
	var getTimeDiffInMin = function (timestamp) {
		if (timestamp) {
			var now = new Date().getTime();
			var then = timestamp.getTime();
			return Math.floor((now - then)/1000/60);
		};
	};
	
	$interval(function () {
		$scope.lastUpdatedInMinAgo = getTimeDiffInMin($scope.lastUpdated);
	},5000);
	
	$scope.jiraSelected = function (jiraId) {
		restService.getJiraDetails(jiraId)
		.then(function (response) {
			$scope.selectedJira = response.data;
			var timelineModal;
			// var detailsModal;
			// var followUpModal;
			// var detailsModalOptions = {
			// 	templateUrl : 'jiraDetailsModal.html',
			// 	scope:$scope,
			// 	size:'lg',
			// 	windowClass : 'custom-modal'
			// }
			// var followUpModalOptions = {
			// 	templateUrl : 'followUpModal.html',
			// 	scope : $scope,
			// 	size : 'lg'
			// };
			// detailsModal = $modal.open(detailsModalOptions);
			// detailsModal.result.then(function (){
			// 	followUpModal = $modal.open(followUpModalOptions);
			// });
			$scope.timelineEvents = getTimelineEvents();
			var timelineModalOptions = {
				templateUrl : 'timelineModal.html',
				scope:$scope,
				size:'lg',
				windowClass : 'custom-modal'
			}
			timelineModal = $modal.open(timelineModalOptions);
			timelineModal.result.finally(function () {
				$scope.timelineModalVariables.includeCommentsInTimeline = false;
			});
		},function () {
			console.log('details were not found for the selected jira');
		});
	};

	$scope.getDueInStatement = function (dueIn) {
		var dueInStatement = '';
		if (dueIn.days) {
			dueInStatement += dueIn.days + ' day(s)';
			if (dueIn.hours || dueIn.minutes) {
				dueInStatement += ', ';
			}
		}
		if (dueIn.hours) {
			dueInStatement += dueIn.hours + ' hour(s)';
			if (dueIn.minutes) {
				dueInStatement += ', ';
			}
		}
		if (dueIn.minutes) {
			dueInStatement += dueIn.minutes + ' minute(s)';
		} 
		return dueInStatement;
	};
	
	$scope.login = function () {
		$scope.loginError = '';
		restService.login($scope.formUser)
		.then(function(response){
			$scope.user = response.data;
			$scope.formUser={};
			loginModal.close();
		},function(errorResponse){
			$scope.loginError = errorResponse.data.message;
		});
	};
	
	$scope.logout = function () {
		restService.logout()
		.finally(function () {
			$scope.user = {};
		});
	};
	
	$scope.showLoginModal = function () {
		
		$scope.loginError = '';
		
		var loginModalOptions = {
			templateUrl : 'loginModal.html',
			scope:$scope,
			size:'sm',
		}
		
		loginModal = $modal.open(loginModalOptions);
	};
	
}]);
