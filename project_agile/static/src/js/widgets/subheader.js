// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.subheader', ['project_agile.BaseWidgets'], function (require) {
    "use strict";
    const AgileBaseWidgets = require('project_agile.BaseWidgets');

    let SubheaderWidget = AgileBaseWidgets.AgileBaseWidget.extend({
        _name: "SubheaderWidget",
        template: "project.agile.subheader",
        setTitle(title){
            if(typeof title === "string"){
                this.$(".view-title").html(`<div class="text-only">${title}</div>`);
            }
            else if(title instanceof jQuery){
                this.$(".view-title").empty().append(title);
            }
        }
    });
    return {
        SubheaderWidget
    };
});