// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.board_chooser', function (require) {
    "use strict";

    const data = require('project_agile.data');
    const ModelList = require('project_agile.model_list');
    const AgileBaseWidget = require('project_agile.BaseWidgets').AgileBaseWidget;
    const storage_service = require('project_agile.storage_service');
    const DataServiceFactory = require('project_agile.data_service_factory');
    const hash_service = require('project_agile.hash_service');
    const _t = require('web.core')._t;
    const crash_manager = require('web.crash_manager');

    const BoardChooser = AgileBaseWidget.extend({
        _name: "BoardChooser",
        template: "project.agile.board_chooser",
        custom_events: {
            'set_board': '_onSetBoard',
        },
        _onSetBoard(evt) {
            this.setBoard(evt.data.id);
        },
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            this.current_board = parseInt(hash_service.get("board"));
            this.current_project = parseInt(hash_service.get("project"));
        },
        willStart() {
            return $.when(
                this._super(),
                // Store reference to current_user, so that we can use it in synchronous methods
                data.cache.get("current_user").then(user => {
                    this.user = user;
                }),
                // If current_project is set, fetch it and store so that it can be used in synchronous project_image_url method
                this.current_project && DataServiceFactory.get("project.project").getRecord(this.current_project).then(project => {
                    this.project = project;
                })
            ).then(() => {
                let board_service = DataServiceFactory.get("project.agile.board");
                return board_service.dataset.id_search("",
                    [["project_ids", "in", this.current_project ? [this.current_project] : this.user.team_ids[this.user.team_id[0]].project_ids]]
                ).then(board_ids => {
                    return board_service.getRecords(board_ids, true).then(records => {
                        this.boards = records;
                        if (this.boards.size == 0) {
                            // delete this.template;
                            crash_manager.show_error({
                                type: _t("Configuration error"),
                                message: _t("Project ") + this.project.name + _t(" does not have any board associated with it."),
                                data: {debug: ""}
                            });
                            hash_service.setHash("page", "dashboard");
                            return $.Deferred().reject();
                        }
                        if (!this.boards.has(this.current_board) && this.boards.size > 0) {
                            this.setBoard([...this.boards.keys()][0])
                        } else {
                            // save current board;
                            this.board = this.boards.get(this.current_board);
                        }
                    })
                })
            });
        },
        setBoard(id) {
            storage_service.set("board", id);

            let boardTypeChanged = this.board === undefined || this.board.type !== this.boards.get(id).type;
            hash_service.setHash("board", id, true, boardTypeChanged);

            if (this.board !== undefined) {
                this.boardList.addItem(this.board);
            }
            this.board = this.boards.get(id);
            if (boardTypeChanged) {
                hash_service.delete("view");
                this.trigger_up("board_type_changed");
            }
            this.$("a.available-boards").html(this.board.name + ' <i class="mdi mdi-menu-down right"></i>')
        },
        start() {
            // Materialize Dropdown
            this.boardList._is_added_to_DOM.then(() => {
                $('.dropdown-button').dropdown({
                    inDuration: 300,
                    outDuration: 125,
                    constrain_width: true, // Does not change width of dropdown to that of the activator
                    hover: false, // Activate on click
                    alignment: 'left', // Aligns dropdown to left or right edge (works with constrain_width)
                    gutter: 0, // Spacing from edge
                    belowOrigin: true // Displays dropdown below the button
                });
            });
        },

        renderElement() {
            this._super();
            let data = [...this.boards.values()];
            this.boardList = new ModelList.ModelList(this, {
                model: "project.agile.board",
                // useDataService: true,
                // domain: [["project_ids", "in", this.current_project ? [this.current_project] : user.team_ids[user.team_id[0]].project_ids]],
                data,
                tagName: "ul",
                id: "board-chooser-dropdown",
                className: "dropdown-content",
                ModelItem: BoardListItem
            });
            // Adding backlog task list
            this.boardList.insertAfter(this.$(".available-boards"));
        },

        project_image_url() {
            return this.current_project ?
                data.getImage("project.project", this.current_project, this.project.write_date) :
                data.getImage("project.agile.team", this.user.team_id[0]);
        }
    });
    const BoardListItem = AgileBaseWidget.extend({
        _name: "BoardListItem",
        template: "project.agile.list.board_chooser_item",
        init(parent, options) {
            this._super(parent, options);
            Object.assign(this, options);
        },
        start() {
            if (this.id == hash_service.get("board")) {
                this.destroy();
            } else {
                // When clicked on project in dashboard, fetch all boards and open last board.
                this.$("a").click(() => {
                    this.selectBoard();
                });
            }
            return this._super();
        },
        selectBoard() {
            this.trigger_up("set_board", {id: this.record.id});
            this.destroy();
        }
    });
    BoardListItem.sort_by = "id";
    return {
        BoardChooser,
        BoardListItem
    };
});
