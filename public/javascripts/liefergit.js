window.liefergit = (function (module, $) {

    var startOAuthAuthentication = function(clientId){
        var popup = window.open('https://github.com' + 
            '/login/oauth/authorize' + 
            '?client_id=' + clientId +
            '&scope=repo,user');
        popup.blur();
        window.focus();
    };


    /*
        EXPORTS
     */
    module.create = function (clientId, successCB) {
        window.addEventListener('message', function (event) {
            var code = event.data;

            // Fetch access token
            var tokenUrl = '/token/' + code;
            $.getJSON(tokenUrl, function (response) {
                accessToken = response.access_token;
                //we are now authentified ---> NEAT
                window.liefergit.github = new Github({
                    token: accessToken,
                    auth: "oauth"
                });
                
                var githubUserUrl = 'https://api.github.com/user?access_token=' + accessToken;
                $.getJSON(githubUserUrl, function (user) {
                    successCB();
                });
            });

            // Remove the event listener again after it was called
            window.removeEventListener('message', this);
        });
        
        startOAuthAuthentication(clientId);
    };

    return module;

}(window.liefergit || _.extend({}, Backbone.Events), $));