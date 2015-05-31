var passport = require('passport'),
bodyParser = require('body-parser'),
session = require('express-session'),
cookieParser = require('cookie-parser'),
cookie = require('cookie'),
LocalStrategy = require('passport-local').Strategy,
LdapStrategy = require('passport-ldapauth'),
MongoStore = require('connect-mongo')(session);

var testUsers = [
	{
		uid:'cyril',
		name:'Cyril Panicker',
		userPassword:'infy@5000',
		email:'cyril@xyz.com'
	},
	{
		uid:'rthanka',
		name:'Rejeesh Thankappan',
		userPassword:'infy@6000',
		email:'rthanka@searshc.com'
	},
	{
		uid:'john',
		name:'John Alexander',
		userPassword:'xyz@2017',
		email:'john@xyz.com'
	},
	{
		uid:'ssiraju',
		name:'Shinu Sirajudeen',
		userPassword:'Apr@2015',
		email:'ssiraju@searshc.com'
	}
];

var getTestUser = function (username) {
	for (var i = testUsers.length - 1; i >= 0; i--) {
		if (testUsers[i].uid == username) {
			return testUsers[i];
		} 
	};
	return null;
};

var authenticateTestUser = function (username,password,done) {
	var user = getTestUser(username);
	if (!user) {
		return done(null,false,{message:'unknown-user'});
	} else if (user.userPassword != password) {
		return done(null,false,{message:'incorrect-password'});
	} else {
		return done(null,{
			userName : user.uid,
			name:user.name,
			email : user.email
		});
	}
};

var serializeTestUser = function (user,done) {
	done(null,user.userName);
};

var serializeLdapUser = function (user,done) {
	done(null,{
		userName : user.uid,
		name : user.cn,
		email : user.mail
	});
};

var deserializeTestUser = function (userName,done) {
	var user = getTestUser(userName);
	if (!user) {
		return done(new Error('unknown-user-in-session'));
	} else {
		return done(null,{
			userName : user.uid,
			name:user.name,
			email : user.email
		});
	}
};

var deserializeLdapUser = function (user,done) {
	return done(null,user);
};

module.exports = function (context) {

	var app = context.app;
	var config = context.config;

	var sessionStore = new MongoStore({
		host:config.session.dbParameters.host,
		port:config.session.dbParameters.port,
		db:config.session.dbParameters.db
	});
	 
	var sessionOptions = {
		secret:config.session.secret,
		saveUninitialized: true,
		resave:false,
		store:sessionStore,
		cookie:{
			httpOnly:true,
			maxAge:config.session.cookieAge
		}
	};

	app.use(cookieParser());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: false}));
	app.use(session(sessionOptions));
	app.use(passport.initialize());
	app.use(passport.session());

	if (context.isTestRun) {

		passport.use(new LocalStrategy(authenticateTestUser));
		passport.serializeUser(serializeTestUser);
		passport.deserializeUser(deserializeTestUser);

		app.post('/login',function (req,res,next) {
			passport.authenticate('local',function (err,user,info) {
				if (!user) {
					res.status(403).send(info);
				} else {
					req.logIn(user,function (err) {
						if (err) {
							res.send({
								message:'error-while-session-creation',
								error:err
							})
						} else {
							res.send(user);
						}
					});
				}
			})(req,res,next);
		});

		app.post('/logout', function (req, res){
			if (!req.user) {
				res.status(409).send('user-not-signed-in');
			} else {
				req.logout();
				res.send({message:'user-signed-out'});
			}
		});
		
	} else {

		var ldapOptions = {
			server: {
				url: 'ldap://glbdirqr.global.us.shldcorp.com:389',
				searchBase: 'ou=people,o=intra,dc=sears,dc=com',
				searchFilter: '(uid={{username}})',
				usernameField:'uid',
				passwordField:'userPassword'
			}
		};

		passport.use(new LdapStrategy(ldapOptions));
		passport.serializeUser(serializeLdapUser);
		passport.deserializeUser(deserializeLdapUser);

		app.post('/login',function (req,res,next) {
			passport.authenticate('ldapauth',{session:true},function (err,user,info) {
				if (err) {
					res.status(500).send({message:'Ldap Connection Error'});
				} else if (!user) {
					res.status(403).send(info);
				} else {
					req.logIn(user,function (err) {
						if (err) {
							res.status(500).send({message:'Session Error'});
						} else {
							res.send({
								userName : user.uid,
								name : user.cn,
								emailId : user.mail
							});
						}
					});
				}
			})(req,res,next);
		});

		app.post('/logout',function (req,res) {
			if (!req.user) {
				res.status(409).send('user-not-signed-in');
			} else {
				req.logout();
				res.send({message:'user-signed-out'});
			}
		});

	};

};