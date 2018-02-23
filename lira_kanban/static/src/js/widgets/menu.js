// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira_kanban.menu_extension', function (require) {
    "use strict";

    var AgileMenu = require('lira.menu');
    var web_core = require('web.core');
    var _t = web_core._t;

    AgileMenu.AgileViewMenu.include({
        build_widget_list() {
            this._super();
            if (this.boardType === "kanban") {
                this.add_widget({
                    name: 'kanban_board',
                    widget: AgileMenu.AgileVerticalMenuItem,
                    append: "ul#nav-mobile",
                    'args': {
                        id: "kanban_board",
                        view: "kanban_board",
                        icon: "bulletin-board",
                        name: _t("Kanban"),
                        sequence: 1,
                    }
                });

                this.add_widget({
                    name: 'kanban',
                    widget: AgileMenu.AgileVerticalMenuItem,
                    append: "ul#nav-mobile",
                    'args': {
                        id: "kanban",
                        view: "kanban",
                        icon: "view-list",
                        name: _t("Backlog"),
                        sequence: 2,
                    }
                });
            }
        }
    });
});
