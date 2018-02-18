// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.view.backlog', function (require) {
    "use strict";
    const data = require('lira.data');
    const DataServiceFactory = require('lira.data_service_factory');
    const AgileViewWidget = require('lira.BaseWidgets').AgileViewWidget;
    const AgileModals = require('lira.widget.modal');
    const ModelList = require('lira.model_list');
    const TaskWidget = require('lira.widget.task').TaskWidget;
    const hash_service = require('lira.hash_service');
    const pluralize = require('pluralize');
    const web_core = require('web.core');
    const qweb = web_core.qweb;
    const _t = web_core._t;
    const core = require('lira.core');
    const AgileToast = require('lira.toast');
    const Sortable = require('sortable');

    const task_service = DataServiceFactory.get("project.task", false);
    const project_service = DataServiceFactory.get("project.project");

    const AbstractBacklogView = AgileViewWidget.extend({
        title: _t("Backlog"),
        template: "lira.view.backlog",
        _name: "BacklogView",
        shouldRenderDragShortcuts: true,
        custom_events: Object.assign(AgileViewWidget.prototype.custom_events || {}, {
            drag_start: '_onDragStart',
            drag_end: '_onDragEnd',
            backlog_list_changed: '_onBacklogListChanged',
            open_link_modal: '_onOpenLinkModal',
            open_new_item_modal: '_onOpenNewItemModal',
            loading_more_items_started: '_onLoadingMoreItemsStarted',
            loading_more_items_finished: '_onLoadingMoreItemsFinished',
        }),
        init(parent, options) {
            this._super(parent, options);

            // Getting board_id from hash and fetch all project_ids from that board in order to create filter for fetching projects
            this.board_id = parseInt(hash_service.get("board"));
            this.task_id = hash_service.get("task") && parseInt(hash_service.get("task"));

            this.filterQuery = "";
            this.taskWidgetItemMap = new Map();
            this.backlogLength = 10;

            window.data = data;
            window.blv = this;
        },
        removeNavSearch() {
            core.bus.trigger("search:remove");
        },
        prepareUser() {
            return data.cache.get("current_user").then(user => {
                this.user = user;
            });
        },
        prepareProjects() {
            return project_service.dataset.id_search("", this.setupProjectIds()
                .then(this.getProjectDomain.bind(this)))
                .then(ids => project_service.getRecords(ids))
                .then(projects => {
                    this.projects = projects;
                });
        },
        prepareBoard() {
            return DataServiceFactory.get("project.agile.board").getRecord(this.board_id).then(board => {
                this.board = board;
            })
        },
        // All variables that will be used in getApplyFilterDomain method must be set prior to calling this._super() when
        loadDependencies() {
            return this.prepareBoard()
                .then(() => this.prepareUser())
                .then(() => this.prepareProjects());
        },
        willStart() {
            let prepared = $.when(this._super(), this.loadDependencies());

            return $.when(
                prepared.then(() => this.getFilteredTaskIds()),
                prepared.then(() => task_service.dataset.id_search(this.filterQuery, this.getBacklogTaskDomain(), false, false, "agile_order")
                    .then(ids => {
                        this.backlogTaskIds = ids;
                    })
                ));
        },
        getBacklogTaskDomain() {
            let domain = [
                ["project_id", "in", this.project_ids],
                ["wkf_state_type", "!=", "done"]
            ];

            if (this.boardTaskTypeFilterExists()) {
                domain.push([
                    "type_id", "in", this.board.task_type_ids
                ]);
            }
            return $.when(domain);
        },
        getProjectDomain() {
            return [
                ["board_ids", "in", this.board_id],
                ["id", "in", this.project_ids],
                ["workflow_id", "!=", false]
            ];
        },
        getApplyFilterDomain() {

            let domain = [
                "|",
                "|",
                ["key", "ilike", this.filterQuery],
                ["description", "ilike", this.filterQuery],
                ["name", "ilike", this.filterQuery],
                ["project_id", "in", this.project_ids],                 // Task must be in one of the projects
            ];

            if (this.boardTaskTypeFilterExists()) {
                domain.push([
                    "type_id", "in", this.board.task_type_ids
                ]);
            }

            return $.when(domain);
        },
        _getTaskItemClass() {
            throw new NotImplementedException("You should return class of non-abstract BacklogTaskItem");
        },
        renderElement() {
            this._super();
            this.backlogTaskList = new BacklogList(this, {
                model: "project.task",
                taskWidgetItemCache: this.taskWidgetItemMap,
                task_ids: this.backlogTaskIds,
                _getNewListWidget: this._getNewListWidget.bind(this),
                ModelItem: this._getTaskItemClass(),
                name: "backlog",
                sortable: {group: "backlog"},
            });

            let backlogData = {
                count: "0 issues",
                estimates: {
                    todo: 0,
                    inProgress: 0,
                    done: 0
                }
            };
            this.backlogNode = $(qweb.render("lira.backlog", backlogData).trim());
            this.backlogNode.insertAfter(this.$("#backlog-view .section"));
            this.backlogTaskList.insertBefore(this.$(".list-preloader"));
            this.$(".list-preloader").hide();
        },
        _getNewListWidget(list_id) {
            throw new NotImplementedException("This method must be implemented")
        },
        start() {
            this._is_added_to_DOM.then(() => {
                core.bus.trigger("search:show", input => {
                    this.applyFilter(input.val());
                });
            });
            this.bindEventListeners();
        },
        bindEventListeners() {
            this.$('.tooltipped').tooltip({delay: 50});
            this.$("#add-task").click(() => {
                let defaults = {
                    project: this.projects.find(p => p.id == hash_service.get("project"))
                };
                this.trigger_up("open_new_item_modal", {
                    currentProjectId: parseInt(hash_service.get("project")) || undefined,
                    focus: "name",
                    defaults,
                    beforeHook: this.setNewTaskOrder.bind(this),
                });
            });
            core.bus.on("project.task:write", this, this._onProjectTaskWrite);
            core.bus.on("project.task:create", this, this._onProjectTaskCreate);
            core.bus.on("project.task:unlink", this, this._onProjectTaskUnlink);
        },
        setNewTaskOrder(task) {
            throw new NotImplementedException();
        },
        getFilteredTaskIds() {
            return task_service.dataset
                .id_search("", this.getApplyFilterDomain(), false, false, "agile_order").then(task_ids => {
                    this.allFilteredTaskIds = task_ids;
                    return task_ids;
                });
        },
        applyFilter(q) {
            if (q === this.queryFilter) {
                return;
            }
            if (q !== undefined) {
                this.filterQuery = q;
            }
            this.getFilteredTaskIds().then(this.handleFilter.bind(this));
        },
        handleFilter(task_ids) {
            this.backlogTaskList.applyFilter(task_ids);
        },
        allTaskIds() {
            return this.backlogTaskList.task_ids.slice();
        },
        getTaskListOfTaskWidget(taskWidget) {
            throw new NotImplementedException();
        },
        isTaskInBacklog(task) {
            throw new NotImplementedException();
        },
        addTaskToNonBacklogList(task) {
            throw new NotImplementedException();
        },
        removeTask(id, removeFromCache = false, syncerMeta) {
            let taskWidget = this.taskWidgetItemMap.get(id);
            if (!taskWidget) {
                return false;
            }
            this.getTaskListOfTaskWidget(taskWidget).removeItem(id);
            if (removeFromCache) {
                this.taskWidgetItemMap.delete(id)
            }
            if (syncerMeta) {
                if (syncerMeta.user_id.id !== data.session.uid && syncerMeta.indirect === false) {
                    AgileToast.toastTask(syncerMeta.user_id, syncerMeta.data, syncerMeta.method);
                }
            }
            return true;
        },

        boardTaskTypeFilterExists() {
            return this.board.task_type_ids && this.board.task_type_ids.length > 0;
        },

        isBoardAllowedTaskType(type_id) {
            return this.boardTaskTypeFilterExists() ? this.board.task_type_ids.includes(type_id) : true;
        },

        addTask(id, syncerMeta, highlight = true) {
            $.when(task_service.getRecord(id)).then(task => {
                // Skip adding tasks from other projects
                if (!this.project_ids.includes(task.project_id[0])) {
                    return;
                }

                if (!this.isBoardAllowedTaskType(task.type_id[0])) {
                    return;
                }

                let taskWidget;
                if (this.isTaskInBacklog(task)) {
                    taskWidget = this.backlogTaskList.addItem(task);

                } else {
                    taskWidget = this.addTaskToNonBacklogList(task);
                }
                if(!taskWidget){
                    return;
                }
                this.taskWidgetItemMap.has(task.id) || this.taskWidgetItemMap.set(task.id, taskWidget);
                highlight && taskWidget._is_added_to_DOM.then(() => {
                    $("#backlog-view").scrollToElement(taskWidget.$el);
                    taskWidget.$el.highlight();
                });
                if (syncerMeta) {
                    if (syncerMeta.user_id.id !== data.session.uid && syncerMeta.indirect === false) {
                        AgileToast.toastTask(syncerMeta.user_id, task, syncerMeta.method);
                    }
                }
            })
        },
        setupProjectIds() {
            return data.cache.get("current_user").then(user => {
                let hashProjectId;
                if (hash_service.get("project")) {
                    if (isNaN(parseInt(hash_service.get("project")))) {
                        throw new Error("Project id in URL must be a number");
                    }
                    hashProjectId = parseInt(hash_service.get("project"));
                    this.project_ids = [hashProjectId];
                }

                return data.cache.get("projects_in_board", {'id': this.board_id,team_id: user.team_id[0]}).then(projectMap => {
                    if (hashProjectId && projectMap.has(hashProjectId)) {
                        return;
                    } else if (hashProjectId) {
                        hash_service.delete("project");
                    }
                    //this.project_ids = user.team_ids[user.team_id[0]].project_ids;
                    let project_ids = [];
                    for (const project of projectMap)
                        project_ids.push(project[0])
                    this.project_ids = project_ids;
                });

            });
        },
        prepareShortcuts(list_id) {
            throw new NotImplementedException("You should either implement this method or disable shortcuts by setting shouldRenderDragShortcuts to false");
        },
        renderDragShortcuts(shortcutPlace, shortcuts, sourceList) {
            this.shortcutContainer = $(`<div class="shortcut-container"></div>`);
            for (let shortcut of shortcuts) {
                let shortcutNode = $(`<div class="shortcut-item agile-main-color lighten-5" data-shortcut-id="${shortcut.id}">${shortcut.name}</div>`);
                shortcutNode[0].addEventListener("dragenter", evt => {
                    $(evt.target).addClass("hover")
                }, false);
                shortcutNode[0].addEventListener("dragleave", evt => {
                    $(evt.target).removeClass("hover")
                }, false);
                Sortable.create(shortcutNode[0], {
                    group: "backlog",
                    onAdd: function (evt) {
                        this.dragShortcutCallback(evt.item, sourceList, shortcut);
                    }.bind(this)
                });
                shortcutNode.appendTo(this.shortcutContainer);
            }
            shortcutPlace.append(this.shortcutContainer);
        },
        dragShortcutCallback(item, sourceList, shortcut) {
            let taskId = parseInt(item.dataset.id);
            let itemWidget = this.taskWidgetItemMap.get(taskId);
            let newListWidget = sourceList._getNewListWidget(shortcut.id);
            // sourceList._setNewItemList(itemWidget, newListWidget);
            let newPosition = shortcut.id ? newListWidget.list.size : 0; // insert to the bottom of the non-backlog list or in the beginning of backlog list
            itemWidget.set_list(newListWidget, sourceList.getNewOrder(0, newPosition, shortcut.id, false));
        },

        _onProjectTaskWrite(id, vals, payload, record) {
            this.removeTask(id, true);
            this.addTask(id, payload, data.session.uid === payload.user_id.id);
            if (this.rightSideWidget && this.rightSideWidget.id === id) {
                let editPromise = record && record._edit("check") ? record._edit() : $.when();
                editPromise.then(()=>{
                    // Since trigger_up wraps event arguments in data object, here I mimic that behaviour.
                    this.trigger("open_right_side", {
                        data: {
                            WidgetClass: TaskWidget,
                            options: {id, isQuickDetailView: true}
                        }
                    });
                });

            }
        },
        _onProjectTaskCreate(id, vals, payload) {
            this.addTask(id, payload);
        },
        _onProjectTaskUnlink(id, payload) {
            this.removeTask(id, true, payload);
            if (this.rightSideWidget && this.rightSideWidget.id === id) {
                this.rightSideWidget.destroy(true);
                delete this.rightSideWidget;
            }
        },
        // CUSTOM EVENT HENDLERS
        _onDragStart(evt) {
            if (this.shouldRenderDragShortcuts) {
                let shortcutPlace = this.$("#backlog-view");
                let shortcuts = this.prepareShortcuts(evt.target.id);
                this.renderDragShortcuts(shortcutPlace, shortcuts, evt.target);
            }
        },
        _onDragEnd(evt) {
            this.shortcutContainer && this.shortcutContainer.remove();
            if (!evt.data.sortableEvent.target || evt.data.sortableEvent.target.classList.contains("shortcut-item")) {
                evt.data.sortableEvent.preventDefault();
            }
        },
        _onBacklogListChanged(evt) {
            this.backlogNode.find(".task-count").text((evt.data.size || 0) + " of " + evt.data.total + " " + pluralize("issue", evt.data.total));
            Waypoint.refreshAll();
        },
        _onOpenLinkModal(evt) {
            if (!evt.data.id) {
                throw new Error("Event payload must contain id of task for wich link should be created");
            }
            task_service.getRecord(evt.data.id).then(record => {
                if (!record) {
                    throw new Error("Task doens't exist");
                }
                let modal = new AgileModals.LinkItemModal(this, {
                    task: record,
                    task_ids: [...this.allTaskIds()],
                    // afterHook: (result) => {
                    //     // Hotfix id: e615f5d1-c9df-41a7-85a8-4621fce94ca7
                    //     // TODO: implement case when rightsidewidget is related task
                    //     if (this.rightSideWidget && this.rightSideWidget.id == modal.task.id) {
                    //         this.rightSideWidget.addLink(result);
                    //     }
                    // }
                });
                modal.appendTo($("body"));
            });
        },
        _onOpenNewItemModal(evt) {
            let options = {
                projects: this.projects
            };
            Object.assign(options, evt.data);
            let newItemModal = new AgileModals.NewItemModal(this, options);
            newItemModal.appendTo($("body"));
        },
        _onLoadingMoreItemsStarted() {
            this.loadingMoreItems = true;
            this.$(".list-preloader").show();
        },
        _onLoadingMoreItemsFinished() {
            this.loadingMoreItems = false;
            if (this.backlogTaskList.shouldLoadMore() && this.$(".master-list").height() / this.$el.height() < 1.1) {
                this.backlogTaskList.loadMoreItems();
            } else {
                this.$(".list-preloader").hide();
            }
        },
        // CUSTOM EVENT HENDLERS END
    });

    const SimpleBacklogTaskItem = ModelList.SimpleTaskItem.extend({
        //order_field: "agile_order",
        _name: "BacklogTaskItem",
        events: {
            'click': function (evt) {
                if (evt.isDefaultPrevented()) {
                    // Skip if default behaviour is prevented, eg. when clicked on menu.
                    return;
                }
                this._onItemClicked(evt);
            },
        },
        _onItemClicked(evt) {
            this.trigger_up("open_right_side", {
                WidgetClass: TaskWidget,
                options: {id: this.record.id, isQuickDetailView: true}
            });
        },
        start() {
            if (this.record.user_id[0] === data.session.uid) {
                this.$(".assign-to-me").hide();
            }
            this.$(".task-menu, .dropdown-content a").click(evt => {
                // Prevent triggering click handler for entire task item
                evt.preventDefault();
            });
            this.$(".edit-item").click(() => {
                this.trigger_up("open_new_item_modal", {
                    currentProjectId: this.record.project_id[0],
                    focus: "name",
                    edit: this.record,
                });
            });

            this.$(".work-log").click(() => {
                let modal = new AgileModals.WorkLogModal(this, {
                    task: this.record,
                    userId: data.session.uid,
                    // edit: this.record,
                });
                modal.appendTo($("body"));

            });

            this.$(".add-link").click(() => {
                this.trigger_up("open_link_modal", {id: this.record.id});
            });

            this.$(".add-comment").click(() => {

                var modal = new AgileModals.CommentItemModal(this, {
                    task: this.record,
                });
                modal.appendTo($("body"));

            });

            !this.task_type.allow_sub_tasks ? this.$(".add-sub-item").hide() :
                this.$(".add-sub-item").click(() => {
                    this.trigger_up("open_new_item_modal", {
                        parent_id: this.record.id,
                        currentProjectId: this.record.project_id[0]
                    });
                });

            this.$(".assign-to-me").click(() => {
                this.record.write({'user_id': data.session.uid}).then(() => {
                    data.cache.get("current_user").then(user => {
                        this.user_id = [user.id, user.name];
                        this.rerenderWidget();
                    });
                });
            });
            this.$(".delete").click(() => {
                this.record.unlink();
            });
            return this._super();
        },
        addedToDOM() {
            this._super();
            this.$('.dropdown-button').dropdown();
        },
        rerenderWidget() {
            this.renderElement();
            this.start();
            this.addedToDOM();
        },
    });

    const BacklogList = ModelList.ModelList.extend({
        _name: "BacklogList",
        pageSize: 10,
        init(parent, options) {
            this._super(parent, options);
            this.size = this.pageSize;
            this._require_prop("task_ids", "Field task_ids is array containing ids of all tasks in backlog");
            this._require_prop("taskWidgetItemCache", "JavaScript Map object where key is id, and value is cached widget item.");
            this._require_prop("_getNewListWidget", "A function that accepts list id in and returns ModelList widget instance");
            this.allFilteredTaskIds = this.getAllTaskIds();
        },
        getAllTaskIds() {
            return this.task_ids;
        },
        loadItems() {
            return task_service.getRecords(this.getSlicedBacklogTaskIds(this.getFilteredTaskIds(this.allFilteredTaskIds))).then(tasks => this.data = tasks);
        },
        shouldLoadMore() {
            return this.allFilteredTaskIds.length > this.list.size;
        },
        getFilteredTaskIds(filtered_task_ids) {
            return filtered_task_ids !== undefined ?
                this.getAllTaskIds().filter(id => filtered_task_ids.includes(id)) :
                this.getAllTaskIds();
        },
        getSlicedBacklogTaskIds(backlog_task_ids) {
            return backlog_task_ids.slice(0, this.size)
        },
        loadMoreItems() {
            this.size += 10;
            let sliced_task_ids = this.getSlicedBacklogTaskIds(this.getFilteredTaskIds(this.allFilteredTaskIds));
            this.trigger_up("loading_more_items_started");
            task_service.getRecords(sliced_task_ids).then(tasks => this.data = tasks).then(tasks => {
                tasks.forEach(this.addItem.bind(this));
                this.trigger_up("loading_more_items_finished");

                /* Because lazy loading backlog items work when you scroll down to bottom of backlog,
                * we need to manage the case where bottom of backlog is above bottom of window.
                * In such case, when master list is less then 110% in height, load more items if available
                */
                this.trigger_up("backlog_list_changed", {size: this.list.size, total: this.allFilteredTaskIds.length});
            })
        },
        addItem(item) {
            if (this.list.has(item.id)) {
                return;
            }
            !this.getAllTaskIds().includes(item.id) && this.getAllTaskIds().push(item.id);
            !this.allFilteredTaskIds.includes(item.id) && this.allFilteredTaskIds.push(item.id);

            let cachedWidget = this.taskWidgetItemCache.get(item.id);
            // Use cached widget if exists on backlog view, or create it and store in cache
            let retVal = this._super(cachedWidget || item);
            cachedWidget || this.taskWidgetItemCache.set(item.id, retVal);

            this.trigger_up("backlog_list_changed", {size: this.list.size, total: this.allFilteredTaskIds.length});
            return retVal;
        },
        removeItem(id, destroy) {
            let removed = this._super.apply(this, arguments);
            this.allFilteredTaskIds.includes(id) && this.allFilteredTaskIds.splice(this.allFilteredTaskIds.indexOf(id), 1);
            if (removed) {
                this.trigger_up("backlog_list_changed", {size: this.list.size, total: this.allFilteredTaskIds.length});
            }
            return removed;
        },
        addedToDOM() {
            this.$el.waypoint({
                handler: (direction) => {
                    if (direction === "down" && this.shouldLoadMore()) {
                        // console.log("Backlog bottom hit, loading more tasks");
                        this.loadMoreItems();
                    }
                },
                context: "#backlog-view",
                offset: 'bottom-in-view'
            })
        },
        applyFilter(filteredTaskIds) {
            // Reset backlog length and slice tasks so that only first page gets loaded.
            this.size = 10;
            this.allFilteredTaskIds = this.getFilteredTaskIds(filteredTaskIds);
            // Remove filtered tasks from list
            for (let id of this.list.keys()) {
                if (!this.allFilteredTaskIds.includes(id)) {
                    this.removeItem(id, false);
                }
            }
            if (this.shouldLoadMore() && !this.loadingMoreItems) {
                this.loadMoreItems();
            }
        }
    });

    const NonBacklogList = ModelList.ModelList.extend({
        _name: "NonBacklogList",
        init() {
            this._super.apply(this, arguments);
            this._require_prop("_getNewListWidget", "A function that accepts list id in and returns ModelList widget instance");
            this._require_prop("taskWidgetItemCache", "JavaScript Map object where key is id, and value is cached widget item.");
            this._require_prop("allFilteredTaskIds", "This is the array of ids that will be used for general filtering of tasks in list.");
        },
        loadItems() {
            return task_service.getRecords(this.getAllTaskIds()).then(tasks => this.data = tasks);
        },
        getAllTaskIds() {
            if (!this.generalFilteredTaskIds) {
                this.generalFilteredTaskIds = this.task_ids.filter(id => this.allFilteredTaskIds.includes(id));
            }
            return this.generalFilteredTaskIds;
        },
        getFilteredTaskIds(filtered_task_ids) {
            let allTaskIds = this.getAllTaskIds();
            return filtered_task_ids !== undefined ?
                filtered_task_ids.filter(id => allTaskIds.includes(id)) : allTaskIds;
        },
        shouldTaskBeAdded(item) {
            if (hash_service.get("project")) {
                let project_id = parseInt(hash_service.get("project"));
                let task_project_id = item._class === "ModelListItem" ? item.record.project_id : item.project_id;
                return isNaN(project_id) || task_project_id && project_id === task_project_id[0];
            }
            return true;
        },
        addItem(item) {
            // Prevent adding tasks to list that doesn't belong to it.
            if (!this.shouldTaskBeAdded(item)) {
                return;
            }
            if (this.list.has(item.id)) {
                return this.list.get(item.id);
            }
            let cachedWidget = this.taskWidgetItemCache.get(item.id);

            // Use cached widget if exists on backlog view, or create it and store in cache
            let retVal = this._super(cachedWidget || item);
            cachedWidget || this.taskWidgetItemCache.set(item.id, retVal);
            this.trigger_up("non_backlog_list_changed", {
                size: this.list.size,
                total: (this.allFilteredTaskIds || this.getAllTaskIds()).length,
                id: this.attributes['data-id']
            });
            return retVal;
        },
        removeItem() {
            let removed = this._super.apply(this, arguments);
            if (removed) {
                this.trigger_up("non_backlog_list_changed", {
                    size: this.list.size,
                    total: (this.allFilteredTaskIds || this.getAllTaskIds()).length,
                    id: this.attributes['data-id']
                });
            }
        },
        applyFilter(filteredTaskIds) {
            this.allFilteredTaskIds = this.getFilteredTaskIds(filteredTaskIds);
            // Add tasks that passed filter to list, if they are missing
            let taskIDsToBeAdded = this.getAllTaskIds().filter(id => this.allFilteredTaskIds.includes(id) && !this.list.has(id));
            task_service.getRecords(taskIDsToBeAdded).then(records => records.forEach(record => this.addItem(record)));

            // Remove filtered tasks from list
            for (let id of this.list.keys()) {
                !this.allFilteredTaskIds.includes(id) && this.removeItem(id, false);
            }
        }
    });

    return {
        AbstractBacklogView,
        BacklogList,
        SimpleBacklogTaskItem,
        NonBacklogList
    };
});
