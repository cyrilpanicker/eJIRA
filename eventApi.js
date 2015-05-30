module.exports = function (context) {

	var update = context.jiraFetchInfo.update;
	var eventEmitter = context.eventEmitter;
	var io = context.io;

	eventEmitter.on('listUpdated',function () {
		io.emit('listUpdated',update);
	});

	eventEmitter.on('errorFetchingJiras',function (errorResponse) {
		io.emit('errorFetchingJiras',errorResponse);
	})

	eventEmitter.on('fetchingJiras',function (delay) {
		io.emit('fetchingJiras',delay);
	});

};