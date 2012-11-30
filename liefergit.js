var config = require("config");
var GitHubApi = require("github");

var github = new GitHubApi({
    version: "3.0.0"
});

github.authenticate({
    type: "basic",
    username: "codazzo",
    password: THEPASS
});

exports.getUB = function(callback){
    github.repos.get({
        user: "delivero",
        repo: "utilitybelt.js"
    }, function(err, res) {
        // console.log(JSON.stringify(res));
        callback(res);
    }); 
}


exports.getUBCommits = function(callback){
    github.repos.getCommits({
        user: "delivero",
        repo: "utilitybelt.js"
    }, function(err, res) {
        // console.log(JSON.stringify(res));
        var latestCommit = res[0].sha;
        callback(latestCommit);
    }); 
}


exports.getContent = function(callback){
    github.repos.getContent({
        user: "delivero",
        repo: "utilitybelt.js",
        path: "/",
        ref: "master"
    }, function(err, res) {
        // console.log(JSON.stringify(res));
        callback(res);
    }); 
}
