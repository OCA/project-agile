// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.view.kanban', function (require) {
    "use strict";
    const BacklogView = require('project_agile.view.backlog');
    const DataServiceFactory = require('project_agile.data_service_factory');
    const hash_service = require('project_agile.hash_service');
    const pluralize = require('pluralize');
    const web_core = require('web.core');
    const qweb = web_core.qweb;
    const ViewManager = require('project_agile.view_manager');

    const task_service = DataServiceFactory.get("project.task", false);

    const KanbanBacklogView = BacklogView.AbstractBacklogView.extend({
        custom_events: Object.assign({}, BacklogView.AbstractBacklogView.prototype.custom_events || {}, {
            non_backlog_list_changed: '_onDefaultKanbanListChanged',
        }),
        willStart() {
            return this._super().then(() => task_service.dataset
                .id_search(this.filterQuery, this.getDefaultKanbanStateDomain())
                .then(ids => {
                    console.log("defaultKanbanStateTaskIds", ids);
                    this.defaultKanbanStateTaskIds = ids;
                }));
        },
        getBacklogTaskDomain() {
            return this._super().then(domain => {
                domain.push(["stage_id", "=", this.board.kanban_backlog_stage_id[0]]);
                return domain;
            });

        },
        getDefaultKanbanStateDomain() {
            return [
                ["stage_id", "=", this.board.kanban_backlog_column_stage_id[0]],
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
                defaultKanbanStateName: this.board.kanban_backlog_column_stage_id[1],
                count: "0 issues",
                estimates: {
                    todo: 0,
                    inProgress: 0,
                    done: 0
                }
            };
            this.defaultKanbanStateNode = $(qweb.render("project.agile.default_kanban_state", defaultKanbanStateData).trim());
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
            return task.stage_id[0] === this.board.kanban_backlog_stage_id[0];
        },
        _getTaskItemClass() {
            return BacklogTaskItem;
        },
        prepareShortcuts(list_id) {
            return list_id === "default_kanban_stage" ? [{id: false, name: "Backlog",}] : [{
                id: "default_kanban_stage",
                name: this.board.kanban_backlog_column_stage_id[1]
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
        set_list(listWidget, order) {
            let board_id = parseInt(hash_service.get("board"));
            DataServiceFactory.get("project.agile.board").getRecord(board_id).then(board => {
                let stage_id = listWidget.attributes && listWidget.attributes["data-id"] === "default_kanban_stage" ?
                    board.kanban_backlog_column_stage_id[0] :
                    board.kanban_backlog_stage_id[0];
                this.record.write({stage_id, [this.order_field]: order}, {context: {kanban_backlog: true}})
                    .done(r => console.info(`Agile stage and order saved for task: ${listWidget.id}, ${order}`))
                    .fail(r => console.error("Error while saving agile order: ", r));
            });
        }
    });
    BacklogTaskItem.sort_by = "agile_order";

    return {
        KanbanBacklogView,
        DefaultKanbanStateList
    };
});