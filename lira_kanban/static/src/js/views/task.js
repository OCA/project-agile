// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira_kanban.view.task', function (require) {
    "use strict";
    const Task = require('lira.view.task');
    const KanbanModals = require('lira_kanban.widget.modal');
    const web_core = require('web.core');
    const _t = web_core._t;

    Task.TaskView.include({
        menuItems: Task.TaskView.prototype.menuItems.concat([
            {
                class: "assign-to",
                icon: "mdi-account-plus",
                text: _t("Assign To"),
                callback: '_onAssignToClick',
                sequence: 2.5,
                hidden() {
                    let taskWidget = this.taskWidget;
                    return taskWidget.data_service.getRecord(taskWidget.id)
                        .then(task => task.project_agile_method != "kanban");
                }
            },
        ]),
        _onAssignToClick() {
            const modal = new KanbanModals.AssignToModal(this.getParent(), {
                task: this.taskWidget._model,
            });
            modal.appendTo($("body"));
        }
    })

});
