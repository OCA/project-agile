// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira_scrum.view.active_sprint', function (require) {
    "use strict";
    const KanbanTable = require('lira.view.kanban_table');
    const ViewManager = require('lira.view_manager');
    const DataServiceFactory = require('lira.data_service_factory');
    const core = require('web.core');
    const _t = core._t;
    const AgileToast = require('lira.toast');

    const SprintTaskTable = KanbanTable.TaskTable.extend({
        shouldCardBeAdded(task, checkForSprint = true) {
            if (checkForSprint && (!task.sprint_id || Object.keys(this.data.active_sprints)[0] != task.sprint_id[0]))
                return false;
            return this._super(task);
        }
    });

    const ActiveSprintView = KanbanTable.TaskKanbanTableView.extend({
        KanbanTable: {KanbanTable: SprintTaskTable},
        emptyTitle: _t("There is no active sprint currently"),
        emptyTemplate: "lira.view.sprint.empty",
        init(parent, options) {
            this._super(parent, options);

            // Getting board_id from hash and fetch all project_ids from that board in order to create filter for fetching projects
            this.boardId = parseInt(hash_service.get("board"));
            this.projectId = parseInt(hash_service.get("project"));

            window.as = this;
        },
        willStart() {
            let options = {};
            if (this.projectId) {
                options.project_id = this.projectId;
            }
            return $.when(this._super(), data.session.rpc(`/lira/web/data/active_sprints/${this.boardId}`, options))
                .then((dummy, r) => {
                    this.data = r;
                    if (this.isEmpty()) {
                        this.template = this.emptyTemplate;
                    }
                });
        },
        isEmpty() {
            return !Object.keys(this.data.active_sprints).length
        },
        getTitle() {
            return this.data.active_sprints[Object.keys(this.data.active_sprints)[0]].name;
        },
        generateKanbanTableOptions() {
            return Object.assign(this._super(), {
                kanbanTableOptionsID: "active_sprint",
            });
        },
        _onProjectTaskWrite(id, delta, payload, task) {
            this._super(id, delta, payload, task);

            if (!this.kanbanTable){
                return
            }

            if (delta.sprint_id === false) {
                if (!this.kanbanTable.shouldCardBeAdded(task, false)) return;
                if (task._previous && task._previous.sprint_id && Object.keys(this.data.active_sprints)[0] == task._previous.sprint_id[0]) {

                    let toastContent = $('<div class="toast-content"><p><span class="toast-user-name">' + this.user.name + '</span> removed ' + task.priority_id[1] + ' ' + task.type_id[1] + ' <span class="toast-task-name">' + task.key + ' - ' + task.name + '</span> from active sprint</p></div>');
                    AgileToast.toast(toastContent, data.getImage("res.users", this.user.id, this.user.__last_update), {
                        text: "open", callback: () => {
                            hash_service.set("task", task.id);
                            hash_service.set("view", "task");
                            hash_service.set("page", "board");
                        }
                    });
                }
            }
        },
    });

    ViewManager.include({
        build_view_registry() {
            this._super();
            this.view_registry.set("sprint", ActiveSprintView);
        },
    });
    return {
        ActiveSprintView,
        SprintTaskTable
    };
});
