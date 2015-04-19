var express = require('express'),
Promise = require('bluebird'),
passport = require('passport'),
bodyParser = require('body-parser'),
session = require('express-session'),
cookieParser = require('cookie-parser'),
cookie = require('cookie'),
MongoStore = require('connect-mongo')(session),
LocalStrategy = require('passport-local').Strategy,

LdapStrategy = require('passport-ldapauth');

var ldapOptions = {
	server: {
		url: 'ldap://glbdirqr.global.us.shldcorp.com:389',
		searchBase: 'ou=people,o=intra,dc=sears,dc=com',
		searchFilter: '(uid={{username}})',
		usernameField:'uid',
		passwordField:'userPassword'
	}
};

jiraService = require('./jiraService');
 
var sessionStore = new MongoStore({
	host:'localhost',
	port:'27017',
	db:'ejira'
});
 
var sessionOptions = {
	secret: 'sacred feminine',
	saveUninitialized: true,
	resave: false,
	store: sessionStore,
	cookie : {
		httpOnly: true,
		maxAge: 86400000
	}
}

var app=express();
app.use(express.static('public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

var users = [
	{
		uid:'cyril',
		name:'Cyril Panicker',
		userPassword:'infy@6000',
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
app.post('/logout', function(req, res){
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

var server = app.listen(8000,function () {
	console.log('server listening at port 8000');
});

var io = require('socket.io')(server);

var processedJiraList = [];
var processedMinimalJiraList = [];
var lastUpdated;

var fetchedInStart, fetchedInEnd, fetchedIn;
var delayStart, delayEnd, delay;

io.on('connection',function (socket) {
	socket.emit('listUpdated',{
		lastUpdated : lastUpdated,
		list : processedMinimalJiraList,
		fetchedIn : fetchedIn
	});
	socket.on('jiraSelected',function (jira) {
		var jiraFound = false;
		for (var i = processedJiraList.length - 1; i >= 0; i--) {
			if (processedJiraList[i].id == jira.id) {
				socket.emit('jiraSelectedDetails',processedJiraList[i]);
				jiraFound = true;
				break;
			}
		};
		if (!jiraFound) {
			console.log('details were not found for the selected jira');
			socket.emit('jiraSelectedDetails',null);
		} 
	});
});

var getMinimalList = function (list) {
	var minimalList=[];
	for (var i = list.length - 1; i >= 0; i--) {
		minimalList[i] = {};
		minimalList[i].id = list[i].id;
		minimalList[i].status = list[i].status;
		minimalList[i].priority = list[i].priority;
		minimalList[i].assignee = list[i].assignee.name;
		minimalList[i].component = list[i].components[0];
		minimalList[i].daysSinceLastWorked = list[i].daysSinceLastWorked;
		if (list[i].slaDueIn) {
			minimalList[i].slaDueIn = list[i].slaDueIn.signedDays;
		}
	};
	return minimalList;
};

var delayFiveMins = function () {
	return new Promise(function (resolve,reject) {
		setTimeout(function () {
			resolve();
		},300000);
	});
};

var delayTwoMins = function () {
	return new Promise(function (resolve,reject) {
		setTimeout(function () {
			resolve();
		},120000);
	});
};

console.log('fetching jiras');

(function loopJiraFetch () {
	fetchedInStart = new Date().getTime();
	jiraService.getTestJiras()
	.then(function(list){
		processedJiraList = jiraService.processList(list);
		processedMinimalJiraList = getMinimalList(processedJiraList);
		lastUpdated = new Date();
		fetchedInEnd = lastUpdated.getTime();
		fetchedIn = fetchedInEnd - fetchedInStart;
		console.log('jiras fetched in '+Math.round((fetchedIn/1000/60)*100)/100+' min');
		io.emit('listUpdated',{
			lastUpdated : lastUpdated,
			list : processedMinimalJiraList,
			fetchedIn : fetchedIn
		});
		delayStart = new Date().getTime();
		return delayFiveMins();
	},function(errorResponse){
		io.emit('errorFetchingJiras',errorResponse);
		console.log('error occured while fetching jiras');
		console.log(errorResponse);
		delayStart = new Date().getTime();
		return delayTwoMins();
	})
	.then(function(response){
		delayEnd = new Date().getTime();
		delay = delayEnd - delayStart;
		console.log('fetching jiras after delay of '+Math.round((delay/1000/60)*100)/100+' min');
		io.emit('fetchingJiras',{
			delay:delay
		});
		loopJiraFetch();
	});
})();
