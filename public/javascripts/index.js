
$(document).ready(function(){

    var upstream_user = "codazzo";
    var repo_user = "TimBeyer";

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

    var upstreamSubmoduleRepos = [{
        user: upstream_user,
        name: "utilitybelt.js",
        path: "core/static/utilitybelt"
    }, {
        user: upstream_user,
        name: "coredesign",
        path: "core/static/coredesign"
    }, {
        user: upstream_user,
        name: "AU_design",
        path: "core/static/AU_design"
    }];


    var startScreen = new StartScreenView({
        template: Handlebars.compile($("#start-screen-template").html()),
        onConnect: function () {
            var clientId = '1c5ca6611f3f2ca17021';
            liefergit.create(clientId, initRepoViews);
        }
    });

    $(".header").append(startScreen.render().el);

    function initRepoViews() {
        var submoduleRepoTemplate = Handlebars.compile($("#submodule-repo-template").html());

        upstreamRepo = new Repo({
            user: upstream_user,
            name: "core_frontend"
        });

        originRepo = new Repo({
            user: repo_user,
            name: "core_frontend"
        });

        var originSubmodules = new Repos(submoduleRepos);
        var upstreamSubmodules = new Repos(upstreamSubmoduleRepos);

        originSubmodules.each(function (repo, i) {
            var submoduleView = new SubmoduleRepoView({
                template: submoduleRepoTemplate,
                submoduleRepo: repo,
                upstreamSubmoduleRepo: upstreamSubmodules.where({name: repo.get("name")})[0],
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