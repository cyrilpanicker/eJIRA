var Promise = require('bluebird');

var mailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter = mailer.createTransport(smtpTransport({
	port:25,
	host:'exchange2010smtp.global.us.shldcorp.com',
	secure:false,
	authMethod:'Plain',
	debug:true,
	ignoreTLS:false
}));

var sendMail = function (options,isTestRun) {
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

module.exports = {
	sendMail : sendMail
};