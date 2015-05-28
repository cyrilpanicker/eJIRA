module.exports = function (context) {

	var update = context.jiraFetchInfo.update;
	var io = context.io;

	io.on('connection',function (socket) {

		socket.emit('listUpdated',update);

	});

};