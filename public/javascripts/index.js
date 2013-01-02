window.liefergit = (function (module, $) {

    var createModels = function (lgit) {
        var models = {
            Repo: Backbone.Model.extend({
                initialize: function (options) {
                    var user = this.get('user');
                    var repoName = this.get('name');

                    var githubRepo = lgit.github.getRepo(user, repoName);
                    this.set('githubRepo', githubRepo);
                },

                getTree: function (branch) {
                    var treeDeferred = $.Deferred();
                    var githubRepo = this.get('githubRepo');
                    githubRepo.getTree(branch + '?recursive=true', function(err, tree) {
                        treeDeferred.resolve(tree);
                    });
                    return treeDeferred;
                },

                getShaForPath: function (path) {
                    var shaDeferred = $.Deferred();

                    $.when( this.getTree("master") ).then(function (tree) {
                        var sha = _.find(tree, function (subtree) {
                            return subtree.path == path;
                        }).sha;
                        shaDeferred.resolve(sha);
                    });

                    return shaDeferred;
                },

                getRef: function (ref) {
                    var refDeferred = $.Deferred();
                    var githubRepo = this.get('githubRepo');
                    githubRepo.getRef(ref, function (err, sha) {
                        refDeferred.resolve(sha);
                    });
                    return refDeferred;
                },

                getCommits: function () {
                    var commitsDeferred = $.Deferred();
                    var githubRepo = this.get('githubRepo');
                    githubRepo.getRef(ref, function (err, commits) {
                        commitsDeferred.resolve(commits);
                    });
                    return commitsDeferred;
                }


            })
        };
        return models;
    };

    var createCollections = function (models) {
        var collections = {
            Repos: Backbone.Collection.extend({
                model: models.Repo,

                getPaths: function () {
                    return this.pluck("path");
                }
            })
        }

        return collections;
    };

    var views = {
        SubmoduleRepoView: Backbone.View.extend({
            tagName: 'div',

            events: {
                'click .update': 'updateSubmoduleReference'
            },

            initialize: function (options) {

                this.template = options.template;
                this.submoduleRepo = options.submoduleRepo;
                this.originRepo = options.originRepo;
                this.upstreamRepo = options.upstreamRepo;

                //this.updateShas();
            },


            updateSubmoduleReference: function () {

                $.when( this.submoduleRepo.getRef("heads/master") )
                .then(_.bind(function (repoSha) {
                    var repoName = this.submoduleRepo.get("name");
                    var repoPath = this.submoduleRepo.get("path");
                    var commitMsg = "Updated submodule " + repoName;
                    var submoduleContent = "Subproject commit " + repoSha + "\n";

                    var subrepoBranchName = "master";

                    var originGithubRepo = this.originRepo.get("githubRepo");
                    var originRepoUser = this.originRepo.get("user");

                    var upstreamGithubRepo = this.upstreamRepo.get("githubRepo");

                    debugger;

                    originGithubRepo.getCommits(function(err, commits) {
                        var coreFrontendHeadSha = commits[0].sha;
                        var coreFrontendHeadTreeSha = commits[0].commit.tree.sha;
                        var theTree = [{
                          "path": repoPath,
                          "mode": "160000", //one of 100644 for file (blob), 100755 for executable (blob), 040000 for subdirectory (tree), 160000 for submodule (commit) or 120000 for a blob that specifies the path of a symlink
                          "type": "commit",
                          "sha": repoSha
                        }];
                        originGithubRepo.postTreeFromBase(theTree, coreFrontendHeadTreeSha, function(err, updateTreeSha){
                            if(err) return;
                            var commitMessage = "Updating repository " + repoName;
                            originGithubRepo.commit(coreFrontendHeadSha, updateTreeSha, commitMessage, function(error, updateCommitSha){
                                originGithubRepo.updateHead(subrepoBranchName, updateCommitSha, function(){
                                    var prTitle = commitMessage;
                                    var prData = {
                                        "title": prTitle,
                                        "body": "A nice pull request",
                                        "head": originRepoUser+":"+subrepoBranchName,
                                        "base": "master"
                                    }
                                    upstreamGithubRepo.createPullRequest(prData, function(err, res){
                                        debugger
                                    });
                                });
                            });
                        });

                    });

                },this));

            },

            render: function () {

                var repoPath = this.submoduleRepo.get("path");

                var submoduleShaDeferred = this.submoduleRepo.getRef("heads/master");
                var upstreamShaDeferred = this.upstreamRepo.getShaForPath(repoPath);

                $.when(submoduleShaDeferred, upstreamShaDeferred).then(_.bind(function (submoduleSha, upstreamSha) {

                    var context = {
                        name: this.submoduleRepo.get("name"),
                        submoduleSha: submoduleSha,
                        upstreamSha: upstreamSha
                    };

                    this.$el.empty();
                    this.$el.append(this.template(context)); 

                }, this));

                return this;
            }

        })
    };


    var LieferGit = function (options) {
        this.github = options.github;
        this.user = options.user;

        this.models = createModels(this);
        this.collections = createCollections(this.models);
        this.views = views;

    }

    var createAuthenticationCB = function(successCB) {
        return function (event) {
            var code = event.data;

            // Fetch access token
            var tokenUrl = '/token/' + code;
            $.getJSON(tokenUrl, function (response) {
                accessToken = response.access_token;
                //we are now authentified ---> NEAT
                var github = new Github({
                    token: accessToken,
                    auth: "oauth"
                });
                
                var githubUserUrl = 'https://api.github.com/user?access_token=' + accessToken;
                $.getJSON(githubUserUrl, function (user) {
                    successCB(new LieferGit({
                        github: github,
                        user: user
                    }));
                });
            });

            // Remove the event listener again after it was called
            window.removeEventListener('message', this);
        }
    };

    var startOAuthAuthentication = function(clientId){
        window.open('https://github.com' + 
            '/login/oauth/authorize' + 
            '?client_id='+ clientId +
            '&scope=repo,user');
    };


    /*
        EXPORTS
     */
    
    module.create = function (clientId, successCB) {
        window.addEventListener('message', createAuthenticationCB(successCB));
        startOAuthAuthentication(clientId);
    };



    return module;

}(window.liefergit || _.extend({}, Backbone.Events), $));

$(document).ready(function(){
    var lgit;

    var upstream_user = "TimBeyer";
    //var repo_user = "delivero";
    var repo_user = "codazzo";
    var branch_name = "master";
    var subrepoBranchName = "master"; //the branch which will be used to issue the PR's against upstream

    var submoduleRepos = [{
        user: repo_user,
        name: "utilitybelt.js",
        path: "core/static/utilitybelt"
    }, {
        user: repo_user,
        name: "coredesign",
        path: "core/static/coredesign"
    }, {
        user: repo_user,
        name: "AU_design",
        path: "core/static/AU_design"
    }];

    var submodules;


    $('.connect').click(function () {
        var clientId = '1c5ca6611f3f2ca17021';

        liefergit.create(clientId, function(lGit){
            userObj = lGit.user;
            lgit = lGit;
            initRepoViews();
        });

    });
    $(".submodules").hide();
    var cfRepoLatest;

    function initRepoViews(){
        $(".main").show();

        var submoduleRepoTemplate = Handlebars.compile($("#sumbodule-repo-template").html());

        upstreamRepo = new lgit.models.Repo({
            user: upstream_user,
            name: "core_frontend"
        });

        originRepo = new lgit.models.Repo({
            user: repo_user,
            name: "core_frontend"
        });

        submodules = new lgit.collections.Repos(submoduleRepos);

        submodules.each(function (repo, i) {
            var submoduleView = new lgit.views.SubmoduleRepoView({
                template: submoduleRepoTemplate,
                submoduleRepo: repo,
                originRepo: originRepo,
                upstreamRepo: upstreamRepo
            });
            $(".submodules").append(submoduleView.render().el);
        });

        $(".header").fadeOut(function(){
            $(".submodules").fadeIn();
        });
    }

});