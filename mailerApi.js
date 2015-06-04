var Promise = require('bluebird');
var mailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var isTestRun, transporter;

var sendMail = function (options) {
	return new Promise(function (resolve,reject) {
		if (isTestRun) {
			resolve('test mail sent');
		} else{
			transporter.sendMail(options,function (error,success) {
				if (error) {
					console.log('error while sending mail : '+error);
					reject();
				} else{
					resolve(success.response);
				};
			});
		};
	});
};

module.exports = function (context) {
	isTestRun = context.isTestRun;
	transporter = mailer.createTransport(smtpTransport(context.config.emailExchangeServerOptions));

	return {
		sendMail : sendMail
	};
};