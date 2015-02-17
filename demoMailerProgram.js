process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var mailer = require('nodemailer');

var transporter = mailer.createTransport({
	service:'Gmail',
	auth:{
		user:'<gmailId>', //access for less secure apps need to be turned on in google settings for this username
		pass:'<password>'
	}
});

transporter.sendMail({
	from:'"eJIRA" <gmailId>',
	to:'ssiraju@searshc.com,schand3@searshc.com,cyrilpanicker@gmail.com',
	subject:'mail from node application',
	text:'We can use "nodemailer" node module to send mails from our POC application. This mail was sent in that manner. Link : https://github.com/andris9/Nodemailer'
},function (error,success) {
	if (error) {
		console.log('error while sending mail : '+error);
	} else {
		console.log('mail sent successfully : '+success.response);
	}
})