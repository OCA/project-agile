// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira_kanban.widget.task', function (require) {
    "use strict";
    const TaskWidget = require('lira.widget.task');
    const KanbanModals = require('lira_kanban.widget.modal');
    const web_core = require('web.core');
    const _t = web_core._t;

    TaskWidget.TaskWidget.include({
        menuItems: TaskWidget.TaskWidget.prototype.menuItems.concat([
            {
                class: "assign-to",
                icon: "mdi-account-plus",
                text: _t("Assign To"),
                callback: '_onAssignToClick',
                sequence: 2.5,
                hidden() {
                    return this.data_service.getRecord(this.id)
                        .then(task => task.project_agile_method != "kanban")
                },
            },
        ]),
        _onAssignToClick() {
            const modal = new KanbanModals.AssignToModal(this.getParent(), {
                task: this._model,
            });
            modal.appendTo($("body"));
        },
    })
});
