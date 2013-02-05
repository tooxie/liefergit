var SubmoduleRepoView = Backbone.View.extend({
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

    render: function() {
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

});