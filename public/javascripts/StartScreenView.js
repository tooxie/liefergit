var StartScreenView = Backbone.View.extend({
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
});