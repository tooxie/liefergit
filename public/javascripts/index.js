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

                getTree: function () {
                    var treeDeferred = $.Deferred();
                    var githubRepo = this.get('githubRepo');
                    githubRepo.getTree('master?recursive=true', function(err, tree) {
                        treeDeferred.resolve(tree);
                    });
                    return treeDeferred;
                },

                getShasForPaths: function (paths) {
                    var shasDeferred = $.Deferred();

                    $.when( this.getTree() ).then(function (tree) {
                        var shas = _.map(paths, function (path) {
                            var sha = _.find(tree, function (subtree) {
                                return subtree.path == path;
                            }).sha;
                            return sha;
                        });
                        shasDeferred.resolve(shas);
                    });

                    return shasDeferred;
                },

                getShaForPath: function (path) {
                    var shaDeferred = $.Deferred();

                    $.when( this.getTree() ).then(function (tree) {
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

            initialize: function (options) {

                this.template = options.template;
                this.upstreamRepo = options.upstreamRepo;
                this.repo = options.repo;

                //this.updateShas();
            },

            updateShas: function () {
                var submoduleShaDeferred = this.repo.getRef("heads/master");
                var upstreamShaDeferred = this.upstreamRepo.getShaForPath(repoPath);

                $.when(submoduleShaDeferred, upstreamShaDeferred).then(_.bind(function (submoduleSha, upstreamSha) {
                    this.submoduleSha = submoduleSha;
                    this.upstreamSha = upstreamSha
                }, this));
            },

            render: function () {

                var repoPath = this.repo.get("path");

                var submoduleShaDeferred = this.repo.getRef("heads/master");
                var upstreamShaDeferred = this.upstreamRepo.getShaForPath(repoPath);

                $.when(submoduleShaDeferred, upstreamShaDeferred).then(_.bind(function (submoduleSha, upstreamSha) {

                    var context = {
                        name: this.repo.get("name"),
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
    var loginData = {};
    var access_token;
    var lgit;
    var github;
    var userObj;
    var cfRepo;
    var upstreamRepo;
    var upstreamGitRepo;
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


    $('#connect').click(function () {
        var clientId = '1c5ca6611f3f2ca17021';

        liefergit.create(clientId, function(lGit){
            github = lGit.github;
            userObj = lGit.user;
            lgit = lGit;
            initRepoViews();
        });

    });

    var cfRepoLatest;
    
    function initRepoViews(){
        $(".main").show();

        var submoduleRepoTemplate = Handlebars.compile($("#sumbodule-repo-template").html());

        upstreamRepo = new lgit.models.Repo({
            user: upstream_user,
            name: "core_frontend"
        });

        upstreamGitRepo = upstreamRepo.get('githubRepo');

        submodules = new lgit.collections.Repos(submoduleRepos);

        submodules.each(function (repo, i) {
            var submoduleView = new lgit.views.SubmoduleRepoView({
                template: submoduleRepoTemplate,
                repo: repo,
                upstreamRepo: upstreamRepo
            });
            $(".main").append(submoduleView.render().el);
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

        });

       
    });
});