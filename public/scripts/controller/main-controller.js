angular.module('app', ['ui.bootstrap'])
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
// .factory('jiraService', ['$http', function ($http) {
// 	var service = {};
// 	service.getJiraList = function () {
// 		return $http({
// 			method:'GET',
// 			url:'/jiras'
// 		});
// 	};
// 	return service;
// }])
.controller('JiraController', ['$scope','$interval','$modal','socket', function ($scope,$interval,$modal,socket) {

	$scope.list = [];
	$scope.filteredList = [];
	$scope.paginatedList = [];
	$scope.filterQueries={};
	$scope.selectedJira = {};

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

	$scope.filterQueries.notWorkedSinceSign = $scope.conditions[2].value;
	$scope.lastUpdatedInMinAgo = 0;

	$scope.filterQueue = [];


	// jiraService.getJiraList()
	// .then(function(response){
	// 	$scope.list = response.data.list;
	// 	$scope.lastUpdated = new Date(response.data.lastUpdated).toLocaleTimeString();
	// },function(errorResponse){
	// 	console.log(errorResponse.data);
	// });

	socket.on('listUpdated',function (response) {
		$scope.list = response.list;
		$scope.lastUpdated = new Date(response.lastUpdated);
		$scope.lastUpdatedInMinAgo = getTimeDiffInMin($scope.lastUpdated);
	});

	var addFilter = function(filterName) {
		if ($scope.filterQueue.indexOf(filterName) == -1) {
			$scope.filterQueue.push(filterName);
		};
	};
	var removeFilter = function(filterName) {
		for (var i = $scope.filterQueue.length - 1; i >= 0; i--) {
			if ($scope.filterQueue[i] == filterName) {
				$scope.filterQueue.splice(i, 1);
				break;
			};
		};
	};

	$scope.onIssueChange = function () {
		if ($scope.filterQueries.issue == '') {
			removeFilter('id');
			$scope.issueFilterApplied = false;
		} else {
			addFilter('id');
			$scope.issueFilterApplied = true;
		}
		$scope.updateFilteredList();
	};

	$scope.onAssigneeChange = function () {
		if (!$scope.filterQueries.assignee) {
			removeFilter('assignee');
			$scope.assigneeFilterApplied = false;
		} else {
			addFilter('assignee');
			$scope.assigneeFilterApplied = true;
		}
		$scope.updateFilteredList();
	};

	$scope.onPriorityChange = function () {
		if (!$scope.filterQueries.priority) {
			removeFilter('priority');
			$scope.priorityFilterApplied = false;
		} else {
			addFilter('priority');
			$scope.priorityFilterApplied = true;
		}
		$scope.updateFilteredList();
	};

	$scope.onNotWorkedSinceChange = function() {
		if (!angular.isNumber($scope.filterQueries.notWorkedSince)) {
			removeFilter('notWorkedSince');
			$scope.notWorkedSinceFilterApplied = false;
		} else {
			addFilter('notWorkedSince');
			$scope.notWorkedSinceFilterApplied = true;
		}
		$scope.updateFilteredList();
	};

	$scope.onStatusChange = function() {
		if (!$scope.filterQueries.status) {
			removeFilter('status');
			$scope.statusFilterApplied = false;
		} else {
			addFilter('status');
			$scope.statusFilterApplied = true;
		}
		$scope.updateFilteredList();
	};

	$scope.onComponentChange = function() {
		if (!$scope.filterQueries.component) {
			removeFilter('component');
			$scope.componentFilterApplied = false;
		} else {
			addFilter('component');
			$scope.componentFilterApplied = true;
		}
		$scope.updateFilteredList();
	};

	var getFilteredList = function (list) {
		if ($scope.filterQueue.length) {
			for (var i = 0; i < $scope.filterQueue.length; i++) {
				switch($scope.filterQueue[i]){
					case 'id': list = filterById(list,$scope.filterQueries.issue);break;
					case 'assignee' : list = filterByAssignee(list,$scope.filterQueries.assignee);break;
					case 'priority' : list = filterByPriority(list,$scope.filterQueries.priority);break;
					case 'status' : list = filterByStatus(list,$scope.filterQueries.status);break;
					case 'component' : list = filterByComponent(list,$scope.filterQueries.component);break;
					case 'notWorkedSince' : list = filterByNotWorkedSinceDays(list,$scope.filterQueries.notWorkedSince,$scope.filterQueries.notWorkedSinceSign);break;
				}
			};
		};
		return list;
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

	var filterByAssignee = function (list,assignee) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			if (list[i].assignee == assignee) {
				filteredList.push(list[i]);
			};
		};
		return filteredList;
	};

	var filterByPriority = function (list,priority) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			if (list[i].priority == priority) {
				filteredList.push(list[i]);
			};
		};
		return filteredList;
	};

	var filterByStatus = function (list,status) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			if (list[i].status == status) {
				filteredList.push(list[i]);
			};
		};
		return filteredList;
	};

	var filterByComponent = function (list,component) {
		var filteredList = [];
		for (var i = 0; i < list.length; i++) {
			if (list[i].component == component) {
				filteredList.push(list[i]);
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

	$scope.updateFilteredList = function () {
		$scope.filteredList = getFilteredList($scope.list);
		// $scope.assignees = getUniquePropertyValues($scope.filteredList,'assignee');
		// $scope.priorities = getUniquePropertyValues($scope.filteredList,'priority');
		// $scope.statuses = getUniquePropertyValues($scope.filteredList,'status');
		// $scope.components = getUniquePropertyValues($scope.filteredList,'component');
		// if ($scope.filteredList.length < 10) {
		// 	$scope.paginatedList = $scope.filteredList.slice(0,10);
		// };
		updatePaginatedList();
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

	$scope.$watch('list', function() {
		$scope.updateFilteredList();
		$scope.assignees = getUniquePropertyValues($scope.list,'assignee');
		$scope.priorities = getUniquePropertyValues($scope.list,'priority');
		$scope.statuses = getUniquePropertyValues($scope.list,'status');
		$scope.components = getUniquePropertyValues($scope.list,'component');
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

	$scope.$watch('paginatedList.currentPage', function(page) {
		updatePaginatedList(page);
	});

	socket.on('jiraSelectedDetails',function (jira) {
		$scope.selectedJira = jira;
		var modalOptions = {
			templateUrl : 'jiraDetailsModal.html',
			scope:$scope,
			size:'lg',
			controller:function($scope,$modalInstance) {
				$scope.back = function () {
					$modalInstance.close();
				};
			}
		}
		var modal = $modal.open(modalOptions);
	});

	$scope.jiraSelected = function (jiraId) {
		socket.emit('jiraSelected',{
			id:jiraId
		});
	};

}]);
