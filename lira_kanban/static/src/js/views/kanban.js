// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.view.kanban', function (require) {
    "use strict";
    const BacklogView = require('lira.view.backlog');
    const DataServiceFactory = require('lira.data_service_factory');
    const hash_service = require('lira.hash_service');
    const pluralize = require('pluralize');
    const web_core = require('web.core');
    const qweb = web_core.qweb;
    const _t = web_core._t;
    const ViewManager = require('lira.view_manager');
    const KanbanModals = require('lira_kanban.widget.modal');

    const task_service = DataServiceFactory.get("project.task", false);

    const KanbanBacklogView = BacklogView.AbstractBacklogView.extend({
        custom_events: Object.assign({}, BacklogView.AbstractBacklogView.prototype.custom_events || {}, {
            non_backlog_list_changed: '_onDefaultKanbanListChanged',
            set_task_stage: '_onSet_task_stage',
        }),
        willStart() {
            return this._super().then(() => task_service.dataset
                .id_search(this.filterQuery, this.getDefaultKanbanStateDomain())
                .then(ids => {
                    console.log("defaultKanbanStateTaskIds", ids);
                    this.defaultKanbanStateTaskIds = ids;
                }).then(() => {
                    return DataServiceFactory
                        .get("project.agile.board.kanban.backlog.state")
                        .getRecords(this.board.kanban_backlog_state_ids)
                        .then(records => {
                            // this.board._custom.backlog_stages = new Map();
                            this.backlog_stages = new Map();
                            _.forEach(records, record => {
                                let states = [];
                                if (!this.backlog_stages.has(record.workflow_id[0])) {
                                    this.backlog_stages.set(record.workflow_id[0], states)
                                } else {
                                    states = this.backlog_stages.get(record.workflow_id[0]);
                                }
                                states.push(record.stage_id[0]);
                            });
                        });
                }).then(()=> {
                    return DataServiceFactory
                        .get("project.agile.board.kanban.backlog.column.status")
                        .getRecords(this.board.kanban_backlog_column_status_ids)
                        .then(records => {
                            this.backlog_column_stages = new Map();
                            _.forEach(records, record => {
                                let status = [];
                                if (!this.backlog_column_stages.has(record.workflow_id[0])) {
                                    this.backlog_column_stages.set(record.workflow_id[0], status)
                                } else {
                                    status = this.backlog_column_stages.get(record.workflow_id[0]);
                                }
                                status.push(record.stage_id[0]);
                            });
                        });
                })
            );
        },
        getBacklogTaskDomain() {
            return this._super().then(domain => {
                domain.push(["stage_id", "in", this.board.kanban_backlog_stage_ids]);
                return domain;
            });

        },
        getDefaultKanbanStateDomain() {
            return [
                ["stage_id", "in", this.board.kanban_backlog_column_stage_ids],
                ["project_id", "in", this.project_ids],
                ["wkf_state_type", "!=", "done"]
            ];
        },
        handleFilter(task_ids) {
            this._super(task_ids);
            this.defaultKanbanStateList.applyFilter(task_ids);
        },
        allTaskIds() {
            let all_task_ids = [];
            // Apparently push method returns the length of the new list instead of the new list
            // So i had to comment out the line below
            //return Array.prototype.push.apply(this._super(), this.backlogTaskList.task_ids);

            // In order to merge two lists into a single one, we should use following:
            Array.prototype.push.apply(all_task_ids, this._super());
            Array.prototype.push.apply(all_task_ids, this.backlogTaskList.task_ids);
            return all_task_ids;
        },
        renderElement() {
            this._super();
            this.defaultKanbanStateList = new DefaultKanbanStateList(this, {
                model: "project.task",
                taskWidgetItemCache: this.taskWidgetItemMap,
                _getNewListWidget: this._getNewListWidget.bind(this),
                allFilteredTaskIds: this.allFilteredTaskIds,
                ModelItem: this._getTaskItemClass(),
                sortable: {group: "backlog"},
                name: "defaultKanbanStateList",
                task_ids: this.defaultKanbanStateTaskIds,
                attributes: {"data-id": "default_kanban_stage"},
            });

            let defaultKanbanStateData = {
                defaultKanbanStateName: this.board.kanban_backlog_column_id[1],
                count: "0 issues",
                estimates: {
                    todo: 0,
                    inProgress: 0,
                    done: 0
                }
            };
            this.defaultKanbanStateNode = $(qweb.render("lira.default_kanban_state", defaultKanbanStateData).trim());
            this.defaultKanbanStateNode.appendTo(this.$("ul.non-backlog-list"));
            this.defaultKanbanStateList.insertAfter(this.$("#default-kanban-state .task-list-header"));
        },
        _getNewListWidget(listId) {
            return listId === "default_kanban_stage" ? this.defaultKanbanStateList : this.backlogTaskList;
        },

        getTaskListOfTaskWidget(taskWidget) {
            return this.isTaskWidgetInBacklog(taskWidget) ? this.backlogTaskList : this.defaultKanbanStateList;
        },

        isTaskWidgetInBacklog(taskWidget) {
            let state = taskWidget.record._previous || taskWidget.record;
            return this.isTaskInBacklog(state);
        },

        isTaskInBacklog(task) {
            return this.backlog_stages.get(task.workflow_id[0]).includes(task.stage_id[0]);
        },
        _getTaskItemClass() {
            return BacklogTaskItem;
        },
        prepareShortcuts(list_id) {
            return list_id === "default_kanban_stage" ? [{id: false, name: "Backlog",}] : [{
                id: "default_kanban_stage",
                name: this.board.backlog_column_id[1]
            }];
        },
        addTaskToNonBacklogList(task) {
            return this.defaultKanbanStateList.addItem(task);
        },
        setNewTaskOrder(task) {
            let destinationTaskList = this.backlogTaskList;

            // get agile_order from list
            task.agile_order = destinationTaskList.getNewOrder(null, destinationTaskList.list.size, false);

        },
        _onDefaultKanbanListChanged(evt) {
            this.defaultKanbanStateNode.find(".task-count").text((evt.data.size || 0) + " of " + evt.data.total + " " + pluralize("issue", evt.data.total));
        },

        _onSet_task_stage(evt){
            let stage_map = evt.data.type === "backlog_column" ?
                    this.backlog_column_stages : this.backlog_stages;

            let stage_id = stage_map.get(evt.data.task.workflow_id[0])[0];

            evt.data.task.write({stage_id, [evt.data.order_field]: evt.data.order}, {context: {kanban_backlog: true}});
                    // .done(r => console.info(`Agile stage and order saved for task: ${listWidget.id}, ${order}`))
                    // .fail(r => console.error("Error while saving agile order: ", r));
        },
    });
    ViewManager.include({
        build_view_registry() {
            this._super();
            this.view_registry.set("kanban", KanbanBacklogView);
        },
    });
    const DefaultKanbanStateList = BacklogView.NonBacklogList.extend({
        _name: "DefaultKanbanStateList",
    });

    const BacklogTaskItem = BacklogView.SimpleBacklogTaskItem.extend({
        menuItems: BacklogView.SimpleBacklogTaskItem.prototype.menuItems.concat([
            {
                class: "assign-to",
                icon: "mdi-account-plus",
                text: _t("Assign To"),
                callback: '_onAssignToClick',
                sequence: 2.5,
            },
        ]),
        set_list(listWidget, order) {
            let board_id = parseInt(hash_service.get("board"));
            DataServiceFactory.get("project.agile.board").getRecord(board_id).then(board => {

                // let stage_map = listWidget.attributes && listWidget.attributes["data-id"] === "default_kanban_stage" ?
                //     board._custom.backlog_column_stages : board._custom.backlog_stages;

                let type = listWidget.attributes && listWidget.attributes["data-id"] === "default_kanban_stage" ?
                    "backlog_column" : "backlog";

                // let stage_id = stage_map.get(this.record.workflow_id[0])[0];

                this.trigger_up("set_task_stage", {
                    task: this.record,
                    order_field: this.order_field,
                    order: order,
                    type: type,
                });
            });
        },
        _onAssignToClick() {
            const modal = new KanbanModals.AssignToModal(this.getParent(), {
                task: this.record,
            });
            modal.appendTo($("body"));
        }
    });
    BacklogTaskItem.sort_by = "agile_order";

    return {
        KanbanBacklogView,
        DefaultKanbanStateList
    };
});
