// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira_kanban.widget.modal', function (require) {
    "use strict";
    const AgileModals = require('lira.widget.modal');
    const Many2One = require('lira.widget.many2one').Many2One;
    const web_core = require('web.core');
    const _t = web_core._t;

    const AssignToModal = AgileModals.ModalWidget.extend({
        template: "lira_kanban.widget.modal.assign_to",
        focus: "name",
        init(parent, options) {
            this._super(parent, options);
            this._require_obj("task", ["_source"], "Task parameter must be data_service record.");
        },
        willStart() {
            return $.when(this._super(), data.cache.get("current_user").then(user => data.cache.get("team_members", {teamId: user.team_id[0]})).then(members => {
                this.members = members;
            }));
        },

        renderElement() {
            this._super(arguments);
            this.assigneeMany2one = new Many2One(this, {
                label: _t("Assignee"),
                model: "res.users",
                field_name: "user_id",
                domain: [
                    ["id", "in", this.members.map(m=>m.id)],
                ],
            });
            this.assigneeMany2one.appendTo(this.$("form"));
        },

        submit(formData) {
            return this.task.write(formData);
        },
    });

    return {
        AssignToModal
    };
});
