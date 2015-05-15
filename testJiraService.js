var Promise = require('bluebird');
var testData = require('./testData.json');

var getAllJiras = function () {
	return new Promise(function (resolve,reject) {
		resolve(testData);
	});
};

module.exports={
	getAllJiras:getAllJiras
};