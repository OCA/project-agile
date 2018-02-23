// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira_scrum.view.kanban.board', function (require) {
    "use strict";
    const KanbanTable = require('lira.view.kanban_table');
    const ViewManager = require('lira.view_manager');
    const KanbanModals = require('lira_kanban.widget.modal');
    const web_core = require('web.core');
    const _t = web_core._t;

    const TaskCard = KanbanTable.TaskCard.extend({
        menuItems: KanbanTable.TaskCard.prototype.menuItems.concat([
            {
                class: "assign-to",
                icon: "mdi-account-plus",
                text: _t("Assign To"),
                callback: '_onAssignToClick',
                sequence: 2.5,
            },
        ]),
        _onAssignToClick() {
            const modal = new KanbanModals.AssignToModal(this.getParent(), {
                task: this.task,
            });
            modal.appendTo($("body"));
        },
    });
    const TaskTable = KanbanTable.TaskTable.extend({
        Card: {Card: TaskCard},
    });

    const KanbanBoardView = KanbanTable.TaskKanbanTableView.extend({
        KanbanTable: {KanbanTable: TaskTable},
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
            return $.when(this._super(), data.session.rpc(`/lira/web/data/kanban_board/${this.boardId}`, options))
                .then((dummy, r) => {
                    this.data = r;
                    if (this.isEmpty()) {
                        this.template = this.emptyTemplate;
                    }
                });
        },
        isEmpty() {
            return false;
        },
        getTitle() {
            return this.data.board.name;
        },
        generateKanbanTableOptions() {
            return Object.assign(this._super(), {
                kanbanTableOptionsID: "kanban_board",
            });
        },
    });

    ViewManager.include({
        build_view_registry() {
            this._super();
            this.view_registry.set("kanban_board", KanbanBoardView);
        },
    });
    return {
        KanbanBoardView,
        TaskTable,
        TaskCard
    };
});
