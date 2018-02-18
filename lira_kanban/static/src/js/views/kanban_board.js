// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira_scrum.view.kanban.board', function (require) {
    "use strict";
    var KanbanTable = require('lira.view.kanban_table');
    var ViewManager = require('lira.view_manager');

    var KanbanBoardView = KanbanTable.TaskKanbanTableView.extend({
        KanbanTable: {KanbanTable: KanbanTable.TaskTable},
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
            return this.data.board.kanban_backlog_column_status.name;
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
        KanbanBoardView
    };
});
