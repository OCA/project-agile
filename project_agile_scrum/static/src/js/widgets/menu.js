// coding: utf-8
// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile_scrum.menu_extension', function (require) {
    "use strict";

    var AgileMenu = require('project_agile.menu');
    var web_core = require('web.core');
    var _t = web_core._t;

    AgileMenu.AgileViewMenu.include({
        build_widget_list() {
            this._super();
            if (this.boardType === "scrum") {
                this.add_widget({
                    name: 'scrum',
                    widget: AgileMenu.AgileVerticalMenuItem,
                    append: "ul#nav-mobile",
                    'args': {
                        id: "scrum",
                        view: "scrum",
                        icon: "view-list",
                        name: _t("Backlog"),
                        sequence: 1,
                    }
                });
                this.add_widget({
                    name: 'active_sprint',
                    widget: AgileMenu.AgileVerticalMenuItem,
                    append: "ul#nav-mobile",
                    'args': {
                        id: "active_sprint",
                        view: "sprint",
                        icon: "clock",
                        name: _t("Active sprint"),
                        sequence: 2,
                    }
                });
            }
        }
    });

});