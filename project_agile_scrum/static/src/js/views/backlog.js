// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile_scrum.view.backlog', function (require) {
    "use strict";
    const BacklogView = require('project_agile.view.backlog');
    const data = require('project_agile.data');
    const DataServiceFactory = require('project_agile.data_service_factory');
    const dialog = require('project_agile.dialog');
    const DataWidget = require('project_agile.BaseWidgets').DataWidget;
    const hash_service = require('project_agile.hash_service');
    const pluralize = require('pluralize');
    const web_core = require('web.core');
    const _t = web_core._t;
    const core = require('project_agile.core');
    const field_utils = require('web.field_utils');
    const AgileToast = require('project_agile.toast');
    const ViewManager = require('project_agile.view_manager');

    const sprint_service = DataServiceFactory.get("project.agile.scrum.sprint", false);

    const SprintDataWidget = DataWidget.extend({
        template: "project.agile.scrum.sprint",
        _name: "SprintDataWidget",
        custom_events: {

            //TODO: Use non_backlog_list_changed event to update counters
            add_item: function (evt) {
                let itemData = evt.data.itemData;
                this.count[itemData.wkf_state_type] += itemData.story_points;

                let wkf_state_class = ".wkf_state_" + itemData.wkf_state_type;
                this.$(wkf_state_class).text(this.count[itemData.wkf_state_type]);
                this.$(".task-count").text((this.taskList.list.size || 0) + " " + pluralize("issue", this.taskList.list.size));
            },
            remove_item: function (evt) {
                let itemData = evt.data.itemData;
                let wkf_state_class = ".wkf_state_" + itemData.wkf_state_type;
                this.count[itemData.wkf_state_type] -= itemData.story_points;
                this.$(wkf_state_class).text(this.count[itemData.wkf_state_type]);
                this.$(".task-count").text((this.taskList.list.size || 0) + " " + pluralize("issue", this.taskList.list.size));
            },

        },
        init(parent, options) {
            this._super(parent, options);

            this._require_prop("taskWidgetItemCache", "JavaScript Map object where key is id, and value is cached widget item.");
            this._require_prop("allFilteredTaskIds", "This is the array of ids that will be used for general filtering of tasks in list.");

            // Store library reference to widget so that it can be used in QWeb
            this.pluralize = pluralize;

            this.count = {
                todo: 0,
                in_progress: 0,
                done: 0,
            }
        },
        start_date_f() {
            return this._model.start_date;
            // var formatted = field_utils.format['datetime'](this._model.start_date);
            // return formatted;
        },

        end_date_f() {
            return this._model.end_date;
            // var formatted = field_utils.format['datetime'](this._model.end_date);
            // return formatted;
        },
        renderElement() {
            this._super();
            this.taskList = new SprintList(this, {
                template: "project.agile.backlog.task_list",
                model: "project.task",
                _getNewListWidget: this._getNewListWidget,
                taskWidgetItemCache: this.taskWidgetItemCache,
                allFilteredTaskIds: this.allFilteredTaskIds,
                ModelItem: this.TaskItemClass,
                id: this._model.id,
                name: this._model.name,
                attributes: {"data-id": this.id},
                sortable: {group: "backlog"},
                sprintData: this._model,
            });
            this.taskList.appendTo(this.$(".collapsible-body"));
        },
        addTask(task) {
            this.taskList.addItem(task);
        },
        start() {
            this.$("#btn_delete").click((e) => {
                this.trigger_up("delete_sprint", {id: this.id});
            });
            this.$("#btn_up").click((e) => {
                this.trigger_up("move_sprint_up", {sprint: this});
            });
            this.$("#btn_down").click((e) => {
                this.trigger_up("move_sprint_down", {sprint: this});
            });
            this.$("#btn_start").click((e) => {
                this.trigger_up("start_sprint", {sprint: this});
            });
            this.$("#btn_end").click((e) => {
                this.trigger_up("end_sprint", {sprint: this});
            });
            return this._super();
        },
        addedToDOM() {
            this._super();
            this.$('.task-list-title, .context-menu').click((evt) => {
                evt.stopPropagation();
            });
            $('.collapsible').collapsible();
        },
    });

    const BacklogTaskItem = BacklogView.SimpleBacklogTaskItem.extend({
        init(parent, options) {
            this._super(parent, options);
            // This field will be used by the view so that it can find task even after record gets updated by the DataService
            this.sprintId = this.record.sprint_id ? this.record.sprint_id[0] : false;
        },
        setSprint(sprint_id) {
            this.record.sprint_id = sprint_id;
        },
        set_list(listWidget, order) {
            this.record.write({sprint_id: listWidget.id, [this.order_field]: order})
                .done(r => console.info(`Agile sprint and order saved for task: ${listWidget.id}, ${order}`))
                .fail(r => console.error("Error while saving agile order: ", r));
        }
    });
    BacklogTaskItem.sort_by = "agile_order";

    const SprintList = BacklogView.NonBacklogList.extend({
        _name: "SprintList",
        getAllTaskIds() {
            if (!this.generalFilteredTaskIds) {
                return this.generalFilteredTaskIds = this.sprintData.task_ids.filter(id => this.allFilteredTaskIds.includes(id));
            }
            return this.sprintData.task_ids.filter(id => this.generalFilteredTaskIds.includes(id));
        },
        addItem() {
            let modelItem = this._super.apply(this, arguments);
            !this.generalFilteredTaskIds.includes(modelItem.id) && this.generalFilteredTaskIds.push(modelItem.id);
            return modelItem;
        }
    });

    const ScrumBacklogView = BacklogView.AbstractBacklogView.extend({
        custom_events: Object.assign(BacklogView.AbstractBacklogView.prototype.custom_events || {}, {
            delete_sprint: '_onDeleteSprint',
            move_sprint_up: '_onMoveSprintUp',
            move_sprint_down: '_onMoveSprintDown',
            start_sprint: '_onStartSprint',
            end_sprint: '_onEndSprint',
        }),
        loadDependencies() {
            return this._super().then(() => {
                this.sprint_ids = this.user.team_ids[this.user.team_id[0]].sprint_ids;
                // return data.xmlidToResId("project_agile.project_task_type_epic").then(epic_type_id => this.epic_type_id = epic_type_id);
            });

        },
        willStart() {
            return this._super().then(() => {
                return sprint_service.dataset.id_search("", this.getSprintDomain())
                    .then(sprint_ids => sprint_service.getRecords(sprint_ids))
                    .then(sprints => {
                        this.sprintMap = new Map();
                        this.ordered_sprint_ids = [];
                        // sort sprints first by order, and then by state so that state is primary sort parameter
                        for (let sprint of sprints.sort((a, b) => a.order - b.order).sort((a, b) => {
                            if (a.state < b.state) {
                                return -1;
                            }
                            if (a.state > b.state) {
                                return 1;
                            }
                            return 0;
                        })) {
                            this.ordered_sprint_ids.push(sprint.id);
                            this.sprintMap.set(sprint.id, sprint);
                        }
                    });
            });
        },
        getBacklogTaskDomain() {
            return this._super().then(domain => {
                domain.push(["sprint_id", "=", false]);
                return domain;
            });
        },
        getSprintDomain() {
            return [["state", "!=", "completed"], ["id", "in", this.sprint_ids]];
        },
        getApplyFilterDomain() {
            return this._super().then(domain => {
                Array.prototype.push.apply(domain, [
                    "|",                                                // 1. Task must be either in:
                    ["sprint_state", "in", ["draft", "active"]],    //      Active or draft sprint
                    ["sprint_id", "=", false],                      //      Or in backlog
                    "|",                                                // 2. One of the following criteria:
                    // "&",                                            //
                    ["sprint_id", "in", this.sprint_ids],       //      Task is in sprint and
                    // ["type_id", "!=", this.epic_type_id],            //      not of type epic
                    "&",                                            //  OR
                    ["sprint_id", "=", false],                  //      Task is in backlog and
                    ["wkf_state_type", "!=", "done"],           //      state type is not "done"
                ]);
                return domain;
            })
        },
        sprintTaskIds() {
            let result = [];
            for (let sprint of this.sprintWidgetsMap.values()) {
                Array.prototype.push.apply(result, sprint._model.task_ids);
            }
            return result;
        },
        handleFilter(task_ids) {
            for (let sprintWidget of this.sprintWidgetsMap.values()) {
                sprintWidget.taskList.applyFilter(task_ids);
            }
            this._super(task_ids);
        },
        allTaskIds() {
            let taskIds = [];
            Array.prototype.push.apply(taskIds, this._super());
            Array.prototype.push.apply(taskIds, this.sprintTaskIds());
            return taskIds;
        },
        renderElement() {
            this._super();
            this.lastest_sprint_order = 0;
            this.sprintWidgetsMap = new Map();
            for (let sprint_id of this.ordered_sprint_ids) {
                let sprint = this.sprintMap.get(sprint_id);
                let sprintWidget = this.addSprint(sprint);

                if (sprint.state === "active") {
                    this.active_sprint = sprintWidget;
                }
            }
            this.renderSprintState();
        },
        _getNewListWidget(sprint_id) {
            if (sprint_id && this.sprintWidgetsMap.has(sprint_id)) {
                return this.sprintWidgetsMap.get(sprint_id).taskList;
            } else {
                return this.backlogTaskList;
            }
        },
        getTaskListOfTaskWidget(taskWidget) {
            return this._getNewListWidget(taskWidget.sprintId);
        },
        isTaskInBacklog(task) {
            return !task.sprint_id;
        },
        isTaskWidgetInBacklog(taskWidget) {
            let state = taskWidget.record._previous || taskWidget.record;
            return this.isTaskInBacklog(state);
        },
        _getTaskItemClass() {
            return BacklogTaskItem;
        },
        prepareShortcuts(list_id) {
            let shortcuts = [...this.sprintWidgetsMap.values()]
                .filter(a => a._model.id != list_id)
                .sort((a, b) => a._model.order > b._model.order)
                .map(a => {
                    return {id: a._model.id, name: a._model.name.trim()}
                });
            if (list_id) {
                shortcuts.push({
                    id: false,
                    name: "Backlog",
                });
            }
            return shortcuts;
        },
        addTaskToNonBacklogList(task) {
            // // Skip adding tasks with type epic to sprint
            // if (task.type_id[0] === this.epic_type_id) {
            //     return;
            // }
            let sprint_id = task.sprint_id[0];
            let sprintWidget = this.sprintWidgetsMap.get(sprint_id);
            if (!sprintWidget) {
                return;
            }
            return sprintWidget.taskList.addItem(task);
        },
        bindEventListeners() {
            this._super();
            this.$("#add-sprint").click(() => {
                let sprintData = {
                    'order': ++this.lastest_sprint_order,
                };
                data.session.rpc(`/agile/web/data/sprint/create/`, {'sprint': sprintData})
                    .then(sprint => {
                        this.addSprint(sprint, true);
                    })
                    .fail(e => {
                        console.error(e);
                    });
            });
            core.bus.on("project.agile.scrum.sprint:write", this, this._onProjectAgileScrumSprintWrite);
            core.bus.on("project.agile.scrum.sprint:create", this, this._onProjectAgileScrumSprintCreate);
            core.bus.on("project.agile.scrum.sprint:unlink", this, this._onProjectAgileScrumSprintUnlink);
        },
        setNewTaskOrder(task) {
            // Get ModelList widget where task is beeing created
            let destinationTaskList = (this.sprintWidgetsMap.get(task.sprint_id)) ? this.sprintWidgetsMap.get(task.sprint_id).taskList : this.backlogTaskList;

            // get agile_order from list
            task.agile_order = destinationTaskList.getNewOrder(null, destinationTaskList.list.size, task.sprint_id);

        },
        swapSprints(sprintWillGoUp, sprintWillGoDown, store = true) {
            // swap on view
            // sprintWillGoUp.$el.remove();
            sprintWillGoUp.$el.insertBefore(sprintWillGoDown.$el);

            // swap model values
            if (store) {
                let tmpOrder = sprintWillGoUp._model.order;
                sprintWillGoUp._model.order = sprintWillGoDown._model.order;
                sprintWillGoDown._model.order = tmpOrder;
            }

            // swap in backlogView.__parentedChildren array;
            let goUpIndex = this.__parentedChildren.findIndex(e => e.id == sprintWillGoUp.id);
            let goDownIndex = this.__parentedChildren.findIndex(e => e.id == sprintWillGoDown.id);
            this.__parentedChildren[goUpIndex] = sprintWillGoDown;
            this.__parentedChildren[goDownIndex] = sprintWillGoUp;

            this.renderSprintState();
        },
        addSprint(sprint, highlight) {
            let team = this.user.team_ids[this.user.team_id[0]];
            if (!team.sprint_ids.includes(sprint.id)) {
                team.sprint_ids.push(sprint.id);
            }
            // Prevent adding same sprint multiple times.
            if (this.sprintWidgetsMap.has(sprint.id)) {
                return;
            }
            this.sprintMap.set(sprint.id, sprint);

            let sprintDataWidget = new SprintDataWidget(this, {
                id: sprint.id,
                taskWidgetItemCache: this.taskWidgetItemMap,
                TaskItemClass: this._getTaskItemClass(),
                data: sprint,
                data_service: sprint_service,
                allFilteredTaskIds: this.allFilteredTaskIds,
                _getNewListWidget: this._getNewListWidget.bind(this),
            });
            sprintDataWidget.appendTo(this.$("ul.non-backlog-list"));
            sprintDataWidget._is_rendered.then(() => {
                this.renderSprintState();
            });
            this.sprintWidgetsMap.set(sprint.id, sprintDataWidget);

            if (highlight) {
                sprintDataWidget._is_added_to_DOM.then(() => {
                    $("#backlog-view").scrollToElement(sprintDataWidget.$el);
                    sprintDataWidget.$el.highlight();
                });
            }

            // because moving sprints up and down depends on order in __parentedChildren array, and last element is assumed to be backlog,
            // swap last two elements.
            let c = this.__parentedChildren;
            if (this.backlogTaskList && c[c.length - 2] === this.backlogTaskList) {
                let tmp = c[c.length - 1];
                c[c.length - 1] = c[c.length - 2];
                c[c.length - 2] = tmp;
            }

            // Remember lastest sprint order for creation of new sprints.
            this.lastest_sprint_order = (this.lastest_sprint_order > sprint.order) ? this.lastest_sprint_order : sprint.order;

            return sprintDataWidget;
        },
        renderSprintState() {
            let sprintWidgets = this.__parentedChildren.filter(e => e.dataset && e.dataset.model === "project.agile.scrum.sprint");
            if (sprintWidgets.length < 1) {
                return;
            }
            let hasActive, firstNonActive;
            if (sprintWidgets[0]._model.state === "active") {
                hasActive = true;
                firstNonActive = false;
                sprintWidgets[0].$el.addClass("sprint-active");
            } else {
                sprintWidgets[0].$el.removeClass("sprint-active");
                hasActive = false;
                firstNonActive = true;
            }

            for (let sprint of sprintWidgets) {
                sprint.$("#btn_start").hide();
                sprint.$("#btn_end").hide();
                sprint.$("#btn_up").hide();
                sprint.$("#btn_down").hide();

                if (sprint._model.state === "active") {
                    sprint.$("#btn_end").show();
                    sprint.$("#btn_delete").hide();
                    sprint.$("#start-end-date").text(`${sprint.start_date_f()} - ${sprint.end_date_f()}`);
                    firstNonActive = true;
                } else if (firstNonActive) {
                    if (!hasActive) {
                        sprint.$("#btn_start").show();
                        //sprint.$("#btn_start").attr("disabled", false);
                    }
                    sprint.$("#btn_down").show();
                    firstNonActive = false;
                } else {
                    sprint.$("#btn_up").show();
                    sprint.$("#btn_down").show();
                }
            }
            // Last print
            sprintWidgets[sprintWidgets.length - 1].$("#btn_down").hide();
        },
        _onProjectTaskWrite(id, vals, payload, task) {
            this._super(id, vals, payload, task);
            let user = payload.user_id;
            // Check if task was moved to sprint that doesn't belong to my team, if someone else has done that and if that change was not indirect.
            if (vals.sprint_id && !this.sprintWidgetsMap.has(vals.sprint_id[0]) && user.id !== data.session.uid && payload.indirect === false) {
                // Skip adding tasks from other projects
                if (!this.project_ids.includes(task.project_id[0])) {
                    return;
                }
                var toastContent = $('<div class="toast-content"><p><span class="toast-user-name">' + this.user.name + '</span> moved ' + task.priority_id[1] + ' ' + task.type_id[1] + ' <span class="toast-task-name">' + task.key + ' - ' + task.name + '</span> to his/her team\'s sprint</p></div>');
                AgileToast.toast(toastContent, data.getImage("res.users", this.user.id, this.user.__last_update), {
                    text: "open", callback: () => {
                        hash_service.set("task", task.id);
                        hash_service.set("view", "task");
                        hash_service.set("page", "board");
                    }
                });
            }
        },
        _onProjectAgileScrumSprintWrite(id, vals, payload) {
            if (vals.order) {
                let sprintWidgets = this.__parentedChildren.filter(w => w._model && w._model.order === vals.order);
                // Since sprint widgets change their order normally by swapping places, write will happen on both sprints that got swapped.
                // When write for first of the sprint happens, in that moment,
                // we will have two sprints with the same order (until second one gets previous order of the first one)
                // When we have two sprints with the same order, we know that they should swap positions,
                // but it souldn't trigger another write, so false is passed for store argument.
                if (sprintWidgets.length == 2) {
                    this.swapSprints(sprintWidgets[1], sprintWidgets[0], false);
                }
            }
            if (vals.state) {
                if (vals.state === "completed") {
                    let sprintWidget = this.sprintWidgetsMap.get(id);
                    if (sprintWidget) {
                        sprintWidget.destroy();
                        this.sprintWidgetsMap.delete(id);
                    } else {
                        console.error("Trying to delete already deleted sprint...")
                    }
                }
                this.renderSprintState();
            }
        },
        _onProjectAgileScrumSprintCreate(id, vals, payload) {
            sprint_service.getRecord(id).then(sprint => {
                this.addSprint(sprint, true);
            })
        },
        _onProjectAgileScrumSprintUnlink(id, payload) {
            this.trigger("delete_sprint", {data: {id, external: true}});
        },
        // CUSTOM EVENT HENDLERS
        _onDeleteSprint(evt) {
            let sprint = this.sprintWidgetsMap.get(evt.data.id);
            if (!sprint) {
                return;
            }
            if (evt.data.external) {
                sprint.destroy();
                this.sprintWidgetsMap.delete(sprint.id);
                this.sprintMap.delete(sprint.id);
                this.renderSprintState();
                return;
            }
            dialog.confirm(_t("Delete sprint"), _t("Are you sure you want to delete this sprint?"), _t("yes")).done(() => {
                sprint.unlink().done(function () {
                    // At this point database doesn't contain record, and we should cleanup widget and remove tasks.
                    let sprintWidget = this.sprintWidgetsMap.get(sprint.id);
                    let backlogListWidget = this.backlogTaskList;

                    for (let task of sprintWidget.taskList.__parentedChildren.reverse()) {
                        task.set_list(backlogListWidget, backlogListWidget.getNewOrder(null, 0, false));
                    }
                    sprint.destroy();
                    this.sprintWidgetsMap.delete(sprint.id);
                    this.sprintMap.delete(sprint.id);
                    this.renderSprintState();

                }.bind(this));
            });
        },
        _onMoveSprintUp(evt) {
            let sprint = evt.data.sprint;
            let indexOfPrevious = this.__parentedChildren.findIndex(e => e.id == sprint.id) - 1;
            let previousSprint = this.__parentedChildren[indexOfPrevious];
            this.swapSprints(sprint, previousSprint);
        },
        _onMoveSprintDown(evt) {
            let sprint = evt.data.sprint;
            let indexOfNext = this.__parentedChildren.findIndex(e => e.id == sprint.id) + 1;
            let nextSprint = this.__parentedChildren[indexOfNext];
            this.swapSprints(nextSprint, sprint);
        },
        _onStartSprint(evt) {
            let sprint = evt.data.sprint;
            dialog.confirm(_t("Start sprint"), _t("Are you sure you want to start this sprint?"), _t("yes")).done(() => {
                var start_date = moment(new Date()).hours(9).minutes(0).seconds(0);

                // When loading backlog view we need to load team details as well.
                // TODO: Here we need to take actual sprint length setting from team level.
                var end_date = start_date.clone().add(2, 'week');

                start_date = field_utils.parse['datetime'](start_date); //, {timezone: false}
                end_date = field_utils.parse['datetime'](end_date); //, {timezone: false})

                data.session.rpc(`/agile/web/data/sprint/${sprint.id}/start`, {
                    start_date: start_date,
                    end_date: end_date
                })
            });
        },
        _onEndSprint(evt) {
            let sprint = evt.data.sprint;
            dialog.confirm(_t("End sprint"), _t("Are you sure you want to end this sprint?"), _t("yes")).done(() => {
                data.session.rpc(`/agile/web/data/sprint/${sprint.id}/stop`);
            });
        }
        // CUSTOM EVENT HENDLERS END
    });
    ViewManager.include({
        build_view_registry() {
            this._super();
            this.view_registry.set("scrum", ScrumBacklogView);
        },
    });

    return {
        ScrumBacklogView,
        BacklogTaskItem,
        SprintList,
        SprintDataWidget
    };
});