// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
odoo.define('project_agile.page.board', function (require) {
    "use strict";

    const AgileContainerWidget = require('project_agile.BaseWidgets').AgileContainerWidget;
    const hash_service = require('project_agile.hash_service');
    const storage_service = require('project_agile.storage_service');
    const AgileMenu = require('project_agile.menu');
    const data = require('project_agile.data');
    const ViewManager = require('project_agile.view_manager');
    const BoardChooser = require('project_agile.board_chooser').BoardChooser;
    const crash_manager = require('web.crash_manager');
    const web_core = require('web.core');
    const _t = web_core._t;

    const BoardPage = AgileContainerWidget.extend({
        template: "project.agile.page.board",
        _name: "BoardPage",
        custom_events: {
            board_type_changed: function () {
                this.rerender_widget(['boardDeferred']);
            }
        },
        init(parent, options) {
            this._super(parent, options);
            this.trigger_up('menu.added');
            window.bp = this;
        },
        willStart() {
            return this._super().then(() => {
                this.boardDeferred = $.Deferred();
                this.getBoard(this.boardDeferred);
                return this.boardDeferred.promise();
            });
        },
        handleNoBoard() {
            crash_manager.show_error({
                type: _t("Configuration error"),
                message: _t("You don't have access to any board."),
                data: {debug: ""}
            });
            hash_service.setHash("page", "dashboard");
        },
        getBoard(deferred) {
            this.board = hash_service.get("board");
            if (!this.board) {
                let board = storage_service.get("board");
                if (board) {
                    this.board = board;
                    hash_service.set("board", this.board);
                }
                else {
                    let project_id = hash_service.get("project");
                    if (project_id) {
                        data.cache.get("board_for_project", {id: project_id}).then(board_id => {
                            if (!board_id) {
                                this.handleNoBoard();
                                return;
                            }
                            this.board = board_id;
                            this.fetchBoard(board_id).done(deferred.resolve);
                            hash_service.set("board", this.board);
                        });
                    }
                    else {
                        data.getDataSet("project.agile.board").read_slice([], {
                            domain: [["is_default", "=", true]]
                        }).then(boards => {
                            if (boards.length === 0) {
                                this.handleNoBoard();
                                deferred.reject();
                                return;
                            }
                            this.board_data = boards[0];
                            hash_service.set("board", this.board_data.id);
                            storage_service.set("board", this.board_data.id);
                            deferred.resolve();
                        })
                    }
                }
            }
            if (this.board) {
                this.fetchBoard(this.board).done(deferred.resolve)
            }
        },
        fetchBoard(board_id) {
            let getBoardDef = $.Deferred();
            data.getDataSet("project.agile.board").read_ids([parseInt(board_id)]).then(boards => {
                if (boards.length === 0) {
                    hash_service.delete("board");
                    storage_service.delete("board");
                    this.getBoard(this.boardDeferred);
                    getBoardDef.reject();
                    return;
                }
                this.board_data = boards[0];
                getBoardDef.resolve();
            });
            return getBoardDef.promise();
        },
        start() {
            this._is_added_to_DOM.then(() => {
                //Main Left Sidebar Menu
                $('.button-collapse').sideNav({
                    menuWidth: 300,
                    edge: 'left', // Choose the horizontal origin
                });
            });
            this.trigger_up('menu.added');
            return this._super();
        },
        destroy() {
            hash_service.delete("task");
            hash_service.delete("view");
            hash_service.delete("board");
            $('.button-collapse').sideNav('hide');
            return this._super();
        },
        build_widget_list() {

            this.add_widget({
                'id': 'menu_widget',
                'widget': AgileMenu.AgileViewMenu,
                'replace': 'widget.aside-left',
                'args': {
                    viewKey: "view",
                    template: "project.agile.menu",
                    boardType: this.board_data.type,
                }
            });
            this.add_widget({
                'id': 'board_chooser',
                'widget': BoardChooser,
                'replace': 'widget.board-chooser',
            });
            this.add_widget({
                'id': 'view_manager_widget',
                'widget': ViewManager,
                'replace': 'widget.view_manager',
                'args': {
                    defaultView: this.board_data.type,
                    _name: "view_manager_widget",
                }
            });
        }
    });

    return BoardPage;
});