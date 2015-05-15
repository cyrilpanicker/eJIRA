var passport = require('passport'),
bodyParser = require('body-parser'),
session = require('express-session'),
cookieParser = require('cookie-parser'),
cookie = require('cookie'),
LocalStrategy = require('passport-local').Strategy,
MongoStore = require('connect-mongo')(session),
config = require('./config.json');

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

var users = [
	{
		uid:'cyril',
		name:'Cyril Panicker',
		userPassword:'infy@5000',
		email:'cyril@xyz.com'
	},
	{
		uid:'tom',
		name:'Tom Abraham',
		userPassword:'Apr@2015',
		email:'tom@xyz.com'
	},
	{
		uid:'john',
		name:'John Alexander',
		userPassword:'xyz@2017',
		email:'john@xyz.com'
	},
	{
		uid:'james',
		name:'James Alex',
		userPassword:'james@1903',
		email:'james@xyz.com'
	}
];
var getUser = function (username) {
	for (var i = users.length - 1; i >= 0; i--) {
		if (users[i].uid == username) {
			return users[i];
		} 
	};
	return null;
};

passport.use(new LocalStrategy(function (username,password,done) {
	var user = getUser(username);
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
}));
passport.serializeUser(function (user,done) {
	done(null,user.userName);
});
passport.deserializeUser(function (userName,done) {
	var user = getUser(userName);
	if (!user) {
		return done(new Error('unknown-user-in-session'));
	} else {
		return done(null,{
			userName : user.uid,
			name:user.name,
			email : user.email
		});
	}
});

module.exports = function (app) {

	app.use(cookieParser());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: false}));
	app.use(session(sessionOptions));
	app.use(passport.initialize());
	app.use(passport.session());

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
	
	app.get('/user',function (req,res,next) {
		if (!req.user) {
			res.send({})
		} else {
			res.send(req.user);
		}
	});

};