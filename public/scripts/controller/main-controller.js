angular.module('app', ['ui.bootstrap','isteven-multi-select'])
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
.controller('JiraController', ['$scope','$interval','$modal','socket', function ($scope,$interval,$modal,socket) {

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
		notWorkedSinceSign:$scope.conditions[2].value,
		notWorkedSince:0,
		statuses:[],
		components:[]
	};

	$scope.translation = {
		selectNone : "Remove Filter",
		search : "Search...",
		nothingSelected : "Apply Filter"
	};

	$scope.lastUpdatedInMinAgo = 0;

	socket.on('listUpdated',function (response) {
		console.log('jiras fetched in '+Math.round(response.fetchedIn/1000/60*100)/100+' min');
		$scope.list = response.list;
		$scope.lastUpdated = new Date(response.lastUpdated);
		$scope.lastUpdatedInMinAgo = getTimeDiffInMin($scope.lastUpdated);
		updateDropDowns();
		$scope.updateFilteredList();
	});

	socket.on('jiraSelectedDetails',function (jira) {
		$scope.selectedJira = jira;
		if (!jira) {
			console.log('details were not found for the selected jira');
		} else {
			var detailsModal;
			var followUpModal;
			var detailsModalOptions = {
				templateUrl : 'jiraDetailsModal.html',
				scope:$scope,
				size:'lg',
				windowClass : 'custom-modal'
			}
			var followUpModalOptions = {
				templateUrl : 'followUpModal.html',
				scope : $scope,
				size : 'lg'
			};
			detailsModal = $modal.open(detailsModalOptions);
			detailsModal.result.then(function (){
				followUpModal = $modal.open(followUpModalOptions);
			});
		}
	});

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
		if ($scope.filters.notWorkedSince) {
			$scope.filteredList = filterByNotWorkedSinceDays($scope.filteredList,$scope.filters.notWorkedSince,$scope.filters.notWorkedSinceSign);
		};
		if ($scope.filters.statuses.length) {
			$scope.filteredList = filterByStatuses($scope.filteredList,$scope.filters.statuses);
		};
		if ($scope.filters.components.length) {
			$scope.filteredList = filterByComponents($scope.filteredList,$scope.filters.components);
		};
		updatePaginatedList();
	};

	$scope.$watch('filters', $scope.updateFilteredList, true);
	$scope.$watch('paginatedList.currentPage', updatePaginatedList);

	var updateDropDowns = function () {
		$scope.assignees = [];
		$scope.priorities = [];
		$scope.statuses = [];
		$scope.components = [];
		var assignees = getUniquePropertyValues($scope.list,'assignee');
		var priorities = getUniquePropertyValues($scope.list,'priority');
		var statuses = getUniquePropertyValues($scope.list,'status');
		var components = getUniquePropertyValues($scope.list,'component');
		for (var i = assignees.length - 1; i >= 0; i--) {
			$scope.assignees.push({name:assignees[i],selected:false});
		};
		for (var i = priorities.length - 1; i >= 0; i--) {
			$scope.priorities.push({name:priorities[i],selected:false});
		};
		for (var i = statuses.length - 1; i >= 0; i--) {
			$scope.statuses.push({name:statuses[i],selected:false});
		};
		for (var i = components.length - 1; i >= 0; i--) {
			$scope.components.push({name:components[i],selected:false});
		};
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

	var filterByNotWorkedSinceDays = function(list,days,sign) {
		var filteredList = [];
		switch(sign){
			case 'equals':
				for (var i = 0; i < list.length; i++) {
					if (list[i].daysSinceLastWorked == days) {
						filteredList.push(list[i]);
					};
				};
				break;
			case 'lessThanEquals':
				for (var i = 0; i < list.length; i++) {
					if (list[i].daysSinceLastWorked <= days) {
						filteredList.push(list[i]);
					};
				};
				break;
			case 'greaterThanEquals':
				for (var i = 0; i < list.length; i++) {
					if (list[i].daysSinceLastWorked >= days) {
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
		socket.emit('jiraSelected',{
			id:jiraId
		});
	};

}]);
