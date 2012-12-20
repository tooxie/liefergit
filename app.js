var config = require('./config'),
    fs = require("fs"),
    http = require('http'),
    _ = require('underscore');

var routes = require('./routes');

var app = config.app;

var routes = {
    '/cf': routes.cf,
    '/': routes.ui,
    '/login': routes.login,
    '/token/*': routes.token
}
_.each(routes, function(handler, route){
    app.get(route, handler);
});

http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
