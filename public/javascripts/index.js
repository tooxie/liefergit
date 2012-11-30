$(document).ready(function(){
  var loginData = {};

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


  $(".login").click(function(){
    var username = $("#username").val();
    var password = $("#password").val();
    loginData.username = username;
    loginData.password = password;
  });

  function showRepos(){

    //init dom: core_frontend
    var cfRepo = github.getRepo("codazzo", "core_frontend");
    cfRepo.getTree('master?recursive=true', function(err, tree) {
      _.each(repos, function(repoObj){
        var sha = _.find(tree, function(subtree){
          return subtree.path == repoObj.path;
        }).sha;
        $(repoObj.selector + " .cf").text(sha);
      });
    });
  }


  _.each(repos, function(repoObj){
    var repo = github.getRepo("codazzo", repoObj.name);
    repoObj.repo = repo;
    repo.getRef('heads/master', function(err, sha) {
      $(repoObj.selector + " .submodule").text(sha);
    });
  });



  //init dom: core_frontend
  var cfRepo = github.getRepo("codazzo", "core_frontend");
  cfRepo.getTree('master?recursive=true', function(err, tree) {
    _.each(repos, function(repoObj){
      var sha = _.find(tree, function(subtree){
        return subtree.path == repoObj.path;
      }).sha;
      $(repoObj.selector + " .cf").text(sha);
    });
  });


  //behavior
  $(".update").click(function(){
    var $this = $(this);
    var repoName = $this.parent().data("repo");
    var repoObj = _.find(repos, function(repoObj){
      return repoObj.name == repoName;
    });
    var sha = $this.siblings(".submodule").text();
    var repo = repoObj.repo;
    if( false ){
      var commitString = 'Subproject commit '+ sha +'\n';
      repo.write('master', repoObj.path, commitString, 'Because I say so', function(err) {
        debugger
      });    
    }

    repo.show(function(err, repo) {
      var a = 2;
      debugger
    });
  })

});