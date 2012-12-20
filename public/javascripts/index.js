window.liefergit = (function (module) {

    var createAuthenticationCB = function(successCB) {
        return function (event) {
            var code = event.data;
            // Fetch access token
            $.getJSON('/token/' + code, function (response) {
                access_token = response.access_token;
                //we are now authentified ---> NEAT
                var github = new Github({
                    token: access_token,
                    auth: "oauth"
                });
                
                $.getJSON('https://api.github.com/user?access_token=' + access_token, function (user) {
                        successCB({
                            github: github,
                            user: user
                        });
                });
            });
        }
    };

    var startOAuthAuthentication = function(clientId){
        window.open('https://github.com' + 
            '/login/oauth/authorize' + 
            '?client_id='+ clientId +
            '&scope=repo,user');
    };

    module.initialize = function (clientId, successCB) {
        window.addEventListener('message', createAuthenticationCB(successCB));
        startOAuthAuthentication(clientId);
    };

    return module;

}(window.liefergit || {}));

$(document).ready(function(){
    var loginData = {};
    var access_token;
    var github;
    var userObj;
    var cfRepo;
    var upstreamRepo;
    var upstream_user = "TimBeyer";
    //var repo_user = "delivero";
    var repo_user = "codazzo";
    var branch_name = "master";
    var subrepoBranchName = "master"; //the branch which will be used to issue the PR's against upstream

    //init DOM: submodules
    window.repos = [{
        name: "utilitybelt.js",
        selector: ".ub",
        path: "core/static/utilitybelt"
    }, {
        name: "coredesign",
        selector: ".cd",
        path: "core/static/coredesign"
    }, {
        name: "AU_design",
        selector: ".au",
        path: "core/static/AU_design"
    }];

    var clientId = '1c5ca6611f3f2ca17021';

    iefergit.initialize(clientId, function(githubObjects){
        github = githubObjects.github;
        userObj = githubObjects.user;

        initRepoViews();
    });

    var cfRepoLatest;
    function initRepoViews(){
        $(".main").show();
        upstreamRepo = github.getRepo(upstream_user, "core_frontend");
        //init dom: core_frontend
        cfRepo = github.getRepo(repo_user, "core_frontend");
        // cfRepo.getTree('master', function(err, tree) {
        //     debugger
        // });

        cfRepo.getTree('master?recursive=true', function(err, tree) {
            _.each(repos, function(repoObj){
                var sha = _.find(tree, function(subtree){
                    return subtree.path == repoObj.path;
                }).sha;
                $(repoObj.selector + " .cf").text(sha);
            });
        });
        //var lePath = ".git/modules/core/static/utilitybelt/refs/heads/master";
        var lePath = "core/static/utilitybelt";

        _.each(repos, function(repoObj){
            var repo = github.getRepo(repo_user, repoObj.name);
            repoObj.repo = repo;
            repo.getRef('heads/master', function(err, sha) {
                $(repoObj.selector + " .submodule").text(sha);
            });
        });

    }

    //behavior
    $(".update").click(function(){
        var $this = $(this);
        var repoName = $this.parent().data("repo");
        var repoObj = _.find(repos, function(repoObj){
            return repoObj.name == repoName;
        });
        var subrepoSha = $this.siblings(".submodule").text();
        var repo = repoObj.repo;

        var commitMsg = "Updated " +" submodule " + repoObj.name;
        var submoduleContent = "Subproject commit " + subrepoSha + "\n";




        cfRepo.getCommits(function(err, commits) {
            var coreFrontendHeadSha = commits[0].sha;
            var coreFrontendHeadTreeSha = commits[0].commit.tree.sha;
            var theTree = [{
              "path": repoObj.path,
              "mode": "160000", //one of 100644 for file (blob), 100755 for executable (blob), 040000 for subdirectory (tree), 160000 for submodule (commit) or 120000 for a blob that specifies the path of a symlink
              "type": "commit",
              "sha": subrepoSha
            }];
            cfRepo.postTreeFromBase(theTree, coreFrontendHeadTreeSha, function(err, updateTreeSha){
                if(err) return;
                var commitMessage = "Updating repository " + repoObj.name;
                cfRepo.commit(coreFrontendHeadSha, updateTreeSha, commitMessage, function(error, updateCommitSha){
                    cfRepo.updateHead(subrepoBranchName, updateCommitSha, function(){
                        var prTitle = commitMessage;
                        var prData = {
                            "title": prTitle,
                            "body": "A nice pull request",
                            "head": repo_user+":"+subrepoBranchName,
                            "base": "master"
                        }
                        upstreamRepo.createPullRequest(prData, function(err, res){
                            debugger
                        });
                    });
                });
            });
            
            // cfRepo.postTree(theTree, function(err, treeSha){
            //     debugger
            //     if(err) return;
            //     cfRepo.commit(headSha, treeSha, "Updated submodule test", function(err, res){
            //         debugger
            //     });
            // });

        });


        this.postTree = function(tree, cb) {
            _request("POST", repoPath + "/git/trees", { "tree": tree }, function(err, res) {
                if (err) return cb(err);
                cb(null, res.sha);
            });
        };

        // cfRepo.updateTree(null, repoObj.path, sha, function(err){
        //     debugger
        // });
        /*
        cfRepo.write(branch_name, repoObj.path, submoduleContent, commitMsg, function(err) {
            debugger
            var pull = {
                title: commitMsg,
                body: "",
                base: branch_name,
                head: repo_user + ":" + branch_name,
            };
            upstreamRepo.createPullRequest(pull, function(err, pullRequest) {
                debugger;
                if (err) {
                    alert(err);
                } else {
                    
                }
            });
        });
        */
    });
});