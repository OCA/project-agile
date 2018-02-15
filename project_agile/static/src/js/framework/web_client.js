// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

"use strict";
odoo.define('web.web_client', function (require) {
    var WebClient = require('web.WebClient');
    var web_client = new WebClient();


    web_client._title_changed = function () {};
    web_client.do_push_state = function (state) {
        this.trigger('state_pushed', state);
    };
    web_client.toggle_fullscreen = function(){};
    web_client.current_action_updated = function(){};
    web_client.show_application = function () {
        return web_client.action_manager.do_action("project_agile");
    };

    $(function () {
        web_client.setElement($(document.body));
        web_client.start();
    });
    return web_client;
});
