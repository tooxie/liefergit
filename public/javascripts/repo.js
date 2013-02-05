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

var Repo = Backbone.Model.extend({
    initialize: function (options) {
        var user = this.get('user');
        var repoName = this.get('name');

        this.githubRepo = window.liefergit.github.getRepo(user, repoName);
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
});