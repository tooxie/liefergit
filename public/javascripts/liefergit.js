window.liefergit = (function (module, $) {

    var deferAsyncCall = function (asyncFunct) {
        var deferred = $.Deferred();
        var args = Array.prototype.slice.call(arguments);
        var asyncFunctArguments = _.rest(args);

        var asyncFunctArgumentsWithCallback = asyncFunctArguments;
        asyncFunctArgumentsWithCallback.push(function (err, result) {
            if (err) {
                deferred.reject(err);
            } 
            else {
                deferred.resolve(result);
            }
        });
        asyncFunct.apply(null, asyncFunctArgumentsWithCallback);

        return deferred;
    };

    var createModels = function (lgit) {
        var models = {
            Repo: Backbone.Model.extend({
                initialize: function (options) {
                    var user = this.get('user');
                    var repoName = this.get('name');

                    this.githubRepo = lgit.github.getRepo(user, repoName);
                },

                getTree: function (branch) {
                    return deferAsyncCall(this.githubRepo.getTree, branch + '?recursive=true');
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
                    return deferAsyncCall(this.githubRepo.getRef, ref);
                },

                getCommits: function () {
                    return deferAsyncCall(this.githubRepo.getCommits);
                },

                getCommit: function (sha) {
                    var commitDeferred = $.Deferred();
                    var commitsDeferred = this.getCommits();

                    $.when(commitsDeferred)
                    .then(function (commits) {
                        var commit = _.where(commits, {sha: sha})[0];
                        commitDeferred.resolve(commit);
                    });
                    return commitDeferred;
                },

                postTreeFromBase: function (tree, baseTree) {
                    return deferAsyncCall(this.githubRepo.postTreeFromBase, tree, baseTree);
                },

                commit: function (parent, tree, message) {
                    return deferAsyncCall(this.githubRepo.commit, parent, tree, message);
                },

                updateHead: function (head, commit) {
                    return deferAsyncCall(this.githubRepo.updateHead, head, commit);
                },

                createPullRequest: function (options) {
                    return deferAsyncCall(this.githubRepo.createPullRequest, options);
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

    var SubmoduleReferenceUpdater = function (submoduleRepo, fromRepo, toRepo) {

        var createUpdatedTree = function (fromRepoCommits, repoSha) {
            var repoPath = submoduleRepo.get("path");
            var theTree = [{
              "path": repoPath,
              "mode": "160000", //one of 100644 for file (blob), 100755 for executable (blob), 040000 for subdirectory (tree), 160000 for submodule (commit) or 120000 for a blob that specifies the path of a symlink
              "type": "commit",
              "sha": repoSha
            }];
            var fromRepoHeadTreeSha = _.first(fromRepoCommits).commit.tree.sha;

            return fromRepo.postTreeFromBase(theTree, fromRepoHeadTreeSha);
        }

        var createPullRequest = function (fromRepoBranchName) {
            var prTitle = "Updating submodule " + submoduleRepo.get('name');
            var originRepoUser = fromRepo.get("user");

            var prData = {
                "title": prTitle,
                "body": "A nice pull request",
                "head": originRepoUser+":"+fromRepoBranchName,
                "base": "master"
            }
            return toRepo.createPullRequest(prData);
        }

        this.createUpdatePullRequest = function (submoduleRef, fromRepoBranchName) {

            var successDeferred = $.Deferred();

            var fromRepoCommitsDeferred = fromRepo.getCommits();
            var submoduleRefDeferred = submoduleRepo.getRef(submoduleRef);

            $.when( fromRepoCommitsDeferred, submoduleRefDeferred )
            .then(function (fromRepoCommits, repoSha) {

                
                var repoName = submoduleRepo.get("name");
                var repoPath = submoduleRepo.get("path");
                var commitMsg = "Updated submodule " + repoName;
                var submoduleContent = "Subproject commit " + repoSha + "\n";

                //the branch which will be used to issue the PR's against upstream
                //var subrepoBranchName = "master";


                var fromRepoHeadSha = _.first(fromRepoCommits).sha;
                var fromRepoHeadTreeSha = _.first(fromRepoCommits).commit.tree.sha;


                var updatedTreeDeferred = createUpdatedTree(fromRepoCommits, repoSha);

                $.when(updatedTreeDeferred)
                .then(function(updateTreeSha){
                    var commitMessage = "Updating repository " + repoName;

                    fromRepo.commit(fromRepoHeadSha, updateTreeSha, commitMessage)
                    .then(function(updateCommitSha){

                        fromRepo.updateHead(fromRepoBranchName, updateCommitSha)
                        .then(function(){

                            createPullRequest(fromRepoBranchName)
                            .then(function(res){
                                successDeferred.resolve();
                            });
                        });
                    });
                });

            
    
            });

            return successDeferred;
        }
    }

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
                this.upstreamSubmoduleRepo = options.upstreamSubmoduleRepo;

                this.state = {
                    isUpdating: false,
                    pullRequestSent: false
                }
                //this.updateShas();
            },


            updateSubmoduleReference: function () {
                var self = this;
                this.state.isUpdating = true;

                var updater = new SubmoduleReferenceUpdater(this.submoduleRepo, this.originRepo, this.upstreamRepo);
                var prSuccess = updater.createUpdatePullRequest("heads/master", "master");
                $.when(prSuccess).then(function () {
                    self.state.pullRequestSent = true;
                    self.render();
                });

                this.render();


            },

            render: function () {

                var repoPath = this.submoduleRepo.get("path");

                var submoduleShaDeferred = this.submoduleRepo.getRef("heads/master");
                var upstreamShaDeferred = this.upstreamRepo.getShaForPath(repoPath);

                $.when(submoduleShaDeferred, upstreamShaDeferred)
                .then(_.bind(function (submoduleSha, upstreamSha) {
                    var submoduleCommitDeferred = this.submoduleRepo.getCommit(submoduleSha);
                    var upstreamCommitDeferred = this.upstreamSubmoduleRepo.getCommit(upstreamSha);

                    //!TODO How to get upstream commit
                    $.when(submoduleCommitDeferred, upstreamCommitDeferred)
                    .then(_.bind(function (submoduleCommit, upstreamCommit) {

                        var context = {
                            name: this.submoduleRepo.get("name"),
                            submoduleSha: submoduleSha,
                            submoduleCommitMessage: submoduleCommit.commit.message,
                            upstreamCommitMessage: "N/A",//upstreamCommit.commit.message,
                            upstreamSha: upstreamSha,
                            isUpToDate: submoduleSha == upstreamSha
                        };

                        this.$el.empty();
                        this.$el.append(this.template(_.extend(context, this.state))); 
                    }, this));

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
        var popup = window.open('https://github.com' + 
            '/login/oauth/authorize' + 
            '?client_id='+ clientId +
            '&scope=repo,user');
        popup.blur();
        window.focus();
    };


    /*
        EXPORTS
     */
    
    module.create = function (clientId, successCB) {
        window.addEventListener('message', createAuthenticationCB(successCB));
        startOAuthAuthentication(clientId);
    };

    module.views = {
        StartScreenView: Backbone.View.extend({
            events: {
                "click .connect": "startConnection"
            },

            initialize: function (options) {
                this.template = options.template;
                this.onConnect = options.onConnect;
                
                this.state = {
                    connecting: false
                };
            },

            startConnection: _.once(function () {
                this.state.connecting = true;
                this.render();
                this.onConnect();
            }),

            render: function () {
                this.$el.empty();
                this.$el.append(this.template(this.state));
                return this;
            }
        })
    };

    return module;

}(window.liefergit || _.extend({}, Backbone.Events), $));