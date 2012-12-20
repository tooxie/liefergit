var $ = require('jquery'),
	_ = require('underscore');
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

exports.token = function(req, res){
	var code = req.params[0];
	var client_id = '1c5ca6611f3f2ca17021';
	var client_secret = '83afc6fbd141b8e773c75b920f92d6fa987d769b';
	var auth_url = 'https://github.com/login/oauth/access_token';
	$.ajax({
	  type: 'POST',
	  url: auth_url,
	  data: {
	  	client_id: client_id,
	  	client_secret: client_secret,
	  	code: code
	  },
	  success: function(jqRes, status, xhr){
	  	var props_array = jqRes.split("&");
	  	var resObj = {};
	  	_.each(props_array, function(el){
	  		var key = el.split("=")[0];
	  		var value = el.split("=")[1];
	  		resObj[key] = value;
	  	})
	  	var resStr = JSON.stringify(resObj);
	  	res.send(resStr);
	  },
	  error: function(jqRes, status, xhr){
	  	res.send("An error occurred while getting the auth token");
	  }
	});
/*
	$data = 'client_id=' . '58a3dcf21a0bae21db44' . '&' .
		'client_secret=' . 'd102461f3339bad28ac26998be39a1e26b5205b9' . '&' .
		'code=' . urlencode($_GET['code']);

$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
*/

}