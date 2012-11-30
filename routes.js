// var lg = require("liefergit");

exports.cf = function(req, res){

	// lg.getUBCommits(function(data){
	// 	console.log(JSON.stringify(data));
	// 	res.send(data);
	// });

	// return;

	// lg.getContent(function(data){
	// 	console.log(JSON.stringify(data));
	// 	res.send(data);		
	// });
}

exports.ui = function(req, res){
	res.sendfile('index.html');
}

exports.login = function(req, res){
	res.sendfile('login.html');
}