var Promise = require('bluebird');
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var mailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

// var transporter = mailer.createTransport({
// 	service:'Gmail',
// 	auth:{
// 		user:'donotreply.ejira@gmail.com', //access for less secure apps need to be turned on in google settings for this username
// 		pass:'ejiraadmin123'
// 	}
// });

var transporter = mailer.createTransport(smtpTransport({
	port:25,
	host:'exchange2010smtp.global.us.shldcorp.com',
	secure:false,
	authMethod:'Plain',
	debug:true,
	ignoreTLS:false
}));

// transporter.sendMail({
// 	from:'schand3@searshc.com',
// 	to:'cpanick@searshc.com',
// 	subject:'just testing',
// 	text:'just testing'
// },function (error,success) {
// 	if (error) {
// 		console.log('error while sending mail : '+error);
// 	} else {
// 		console.log('mail sent successfully : '+success.response);
// 	}
// })

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