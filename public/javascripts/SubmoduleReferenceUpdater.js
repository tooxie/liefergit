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