var mailer = require('./mailerApi');

module.exports = function (context) {

	var app = context.app;

	app.get('/user',function (req,res,next) {
		if (!req.user) {
			res.send({})
		} else {
			res.send(req.user);
		}
	});

	app.get('/jira',function (req,res,next) {
		var jiraFound = false;
		for (var i = context.jiraFetchInfo.processedList.length - 1; i >= 0; i--) {
			if (context.jiraFetchInfo.processedList[i].id == req.query.id) {
				jiraFound = true;
				res.send(context.jiraFetchInfo.processedList[i]);
				break;
			}
		};
		if (!jiraFound) {
			console.log('details were not found for the selected jira');
			res.status(500).send('jira-not-found');
		} 
	});

	app.post('/mail',function (req,res,next) {
		mailer.sendMail(req.body,context.isTestRun)
		.then(function (response) {
			res.send(response);
		},function (errorResponse) {
			res.status(500).send('error-sending-mail');
		});
	});

};