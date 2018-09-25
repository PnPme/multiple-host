var fs = require("fs");
var platform = require("./lib/platform");

var ContentModel = Backbone.Model.extend();
var ContentView = Backbone.View.extend({
    "switchView": function() {
        var showViewClass = '.js-' + this.model.get("hashName");
        var toClass = ".js-to-" + this.model.get("hashName");
        $(".js-content").hide();
        this.beforeShow();
        $(showViewClass).show();
        $(".selected").removeClass("selected");
        $(toClass).addClass("selected");
    },
    "beforeShow": function() {}
});

var startModel = new ContentModel();
var logModel = new ContentModel();
var hostModel = new ContentModel();
var settingsModel = new ContentModel();

startModel.set({hashName: "start"});
logModel.set({hashName: "log"});
hostModel.set({hashName: "host"});
settingsModel.set({hashName: "settings"});

var StartView = ContentView.extend({
    "model": startModel,
    "el": $(".js-start")[0],
    "events": {
        "click #open_chrome": "openChrome",
    },
    "openChrome": function(e) {
        var target = e.target;
        if ($(target).hasClass("lock")) {
            return;
        }
        try {
            var port = localStorage.getItem("serverPort") || 9393;
            $(target).addClass("lock");
            $(target).html("启动中...");
            platform.startChrome(function(error) {
                if (error) {
                    logger.doLog("log", error.message );
                }
                else {
                    logger.doLog("log", "chrome启动成功，代理端口: " + port );
                }
            });

            setTimeout(function() {
                $(target).removeClass("lock");
                $(target).html("唤起代理chrome");
            }, 5000);
        } catch (err) {
            logger.doLog("error", "Error while trying to start child process: " + JSON.stringify(err) );
        }
    }
});
var startView = new StartView();

var SettingsView = ContentView.extend({
    "model": settingsModel,
    "el": $(".js-settings")[0],
    "events": {
        "click #saveBtn": "saveSettings",
        "change .js-browser-path": "changeFile"
    },
    "saveSettings": function() {

        var port = this.$el.find("[name=serverPort]").val();
        var chromePath = this.$el.find(".js-chrome-path .js-showPath").val();
        var minifySetting = this.$el.find("#minifySetting").prop('checked');

        localStorage.setItem("minifySetting", minifySetting); //最小化到托盘

        if (parseInt(port, 10)) { //node端口
            localStorage.setItem("serverPort", port);
            process.mainModule.exports.setConfig("serverPort", port);
        }
        if (fs.existsSync(chromePath)) { //chrome地址
            localStorage.setItem("chromePath", chromePath);
            process.mainModule.exports.setConfig("chromePath", chromePath);
        }
        $(".popup-success").show().animate({
            top: "50%"
        }, 1000, function() {
            $(".popup-success").hide().css({
                top: "60%"
            });
        });

    },
    "changeFile": function(e) {
        var $show = $(e.target).siblings(".js-showPath");
        $show.val(e.target.value || "");
    },
    "render": function() {
        var port = localStorage.getItem("serverPort") || 9393;
        var chromePath = localStorage.getItem("chromePath") || platform.defaultChromePath;
        var minifySetting = localStorage.getItem("minifySetting");

        minifySetting = minifySetting == "true" ? true : false;
        this.$el.find("[name=serverPort]").val(port);
        this.$el.find(".js-chrome-path .js-showPath").val(chromePath);
        this.$el.find("#minifySetting").prop('checked', minifySetting);
        if (platform.platform === 'mac') { //osx无法选择到应用程序
            this.$el.find('.js-change-path').hide();
        }
    }
});

var LogView = ContentView.extend({
    "model": logModel,
    "el": $(".js-log")[0],
    "events": {
        "click .js-clear-log": "clearLog",
        "input .js-filter-log": "filterLog"
    },
    "clearLog": function() {
        window.logger.clearLogger()
    },
    "filterLog": function(e) {
        window.logger.filterLogger(e.target.value);
    }

});

var HostView = ContentView.extend({
    "el": $(".js-host")[0],
    "beforeShow": function() {
    }
});

var logView = new LogView();
var hostView = new HostView({"model": hostModel});
var settingsView = new SettingsView();

var AppRouter  = Backbone.Router.extend({
    routes: {
        "pages/start": "start",
        "pages/log": "log",
        "pages/host": "host",
        "pages/settings": "settings"
    },
    "initialize": function() {
    },
    "start": function() {
        startView.switchView();
    },
    "log": function() {
        logView.switchView();
    },
    "host": function() {
        hostView.switchView();
    },
    "settings": function() {
        settingsView.switchView();
        settingsView.render();
    }
});

var router = new AppRouter();
Backbone.history.start();

router.navigate("pages/start", {trigger: true, replace: true});

$(".js-to-start").addClass("selected");
