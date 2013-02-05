var Repos = Backbone.Collection.extend({
    model: Repo,

    getPaths: function () {
        return this.pluck("path");
    }
});