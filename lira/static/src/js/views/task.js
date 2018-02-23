// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.view.task', function (require) {
    "use strict";
    const data = require('lira.data');
    const DataServiceFactory = require('lira.data_service_factory');
    const BaseWidgets = require('lira.BaseWidgets');
    const hash_service = require('lira.hash_service');
    const TaskWidget = require('lira.widget.task').TaskWidget;
    const AgileModals = require('lira.widget.modal');
    const AgileToast = require('lira.toast');
    const core = require('lira.core');
    const web_core = require('web.core');
    const qweb = web_core.qweb;
    const _t = web_core._t;
    const dialog = require('lira.dialog');

    var TaskView = BaseWidgets.AgileViewWidget.extend({
        title: "Task View",
        _name: "TaskView",
        template: "lira.view.task",
        menuItems: [
            {
                class: "assign-to-me",
                icon: "mdi-account-check",
                text: _t("Assign To Me"),
                callback: '_onAssignToMeClick',
                sequence: 1,
                hidden() {
                    let taskWidget = this.taskWidget;
                    return taskWidget.data_service.getRecord(taskWidget.id)
                        .then(task => task.user_id && task.user_id[0] == data.session.uid)
                }
            },

            {
                class: "unassign",
                icon: "mdi-account-minus",
                text: _t("Unassign"),
                callback: '_onUnassignClick',
                sequence: 2,
                hidden() {
                    let taskWidget = this.taskWidget;
                    return taskWidget.data_service.getRecord(taskWidget.id)
                        .then(task => !(task.user_id && task.user_id[0] == data.session.uid))
                },
            },
            {
                class: "edit-item",
                icon: "mdi-pencil",
                text: _t("Edit"),
                callback: '_onEditItemClick',
                sequence: 3,
            },
            {
                class: "add-sub-item",
                icon: "mdi-subdirectory-arrow-right",
                text: _t("Add Sub Item"),
                callback: '_onAddSubItemClick',
                sequence: 4,
                hidden() {
                    let taskWidget = this.taskWidget;
                    return taskWidget.data_service.getRecord(taskWidget.id)
                        .then(task => {
                            return DataServiceFactory.get("project.task.type2")
                                .getRecord(task.type_id[0])
                                .then(task_type => !task_type.allow_sub_tasks)
                        })
                },
            },
            {
                class: "add-link",
                icon: "mdi-link",
                text: _t("Add Link"),
                callback: '_onAddLinkClick',
                sequence: 5,
            },
            {
                class: "work-log",
                icon: "mdi-worker",
                text: _t("Log Work"),
                callback: '_onWorkLogClick',
                sequence: 6,
            },
            {
                class: "add-comment",
                icon: "mdi-comment-account",
                text: _t("Add Comment"),
                callback: '_onAddCommentClick',
                sequence: 7,
            },
            {
                class: "delete",
                icon: "mdi-delete",
                text: _t("Delete task"),
                callback: '_onDelete',
                sequence: 8,
            },
        ],

        init(parent, options) {
            this._super(parent, options);
            this.taskId = parseInt(hash_service.get("task"));
            if (!this.taskId) {
                throw new Error(_t("Task id must be set in Task view"));
            }
            this.renderTask();
            hash_service.on("change:task", this, (hash_service, options) => this.loadTask(parseInt(hash_service.get("task"))));
        },
        renderTask(id, data) {
            if (id) {
                this.taskId = id;
            }
            if (this.taskWidget && typeof this.taskWidget.destroy === "function") {
                //this.$el.empty();
                this.taskWidget.destroy();
            }
            this.taskWidget = new TaskWidget(this, {
                id: this.taskId,
                template: "lira.view.task_widget",
                data,
                highlightNewWidget: this.scrollAndHighlight
            });
            this.taskWidget._is_rendered.then(this.afterTaskRender.bind(this));
        },
        loadTask(id, data) {
            this.renderTask(id, data);
            this.taskWidget.appendTo(this.$el);
        },
        afterTaskRender() {
            let title = $(qweb.render("lira.view.task.title", {widget: this.taskWidget}));
            title.find(".task-key").click(e => {
                let taskId = $(e.currentTarget).attr("task-id");
                hash_service.setHash("task", taskId);
                hash_service.setHash("view", "task");
                hash_service.setHash("page", "board");
            });
            this.setTitle(title, this.taskWidget.name);
            this.taskWidget.$el.responsive();

            if (this.workflowTaskWidget) {
                this.workflowTaskWidget.destroy();
            }

            window.wtw = this.workflowTaskWidget = new WorkflowTransitionsWidget(this, {
                taskWidget: this.taskWidget
            });
            this.updateMenuVisibility();
            this.trigger_up("init_action_menu", {
                items: [
                    {widget: this.workflowTaskWidget}
                ]
            });
        },
        renderElement() {
            this._super();
            this.taskWidget.appendTo(this.$el);
        },
        scrollAndHighlight(widget) {
            widget._is_added_to_DOM.then(() => {
                $("#middle-content").scrollToElement(widget.$el);
                widget.$el.highlight();
            })
        },
        start() {
            core.bus.on("project.task:write", this, (id, vals, payload, record) => {
                if (id === this.taskId) {
                    let editPromise = record._edit("check") ? record._edit() : $.when();
                    editPromise.then(() => {
                        this.loadTask(record.id, record);
                    });

                    if (payload) {
                        if (payload.user_id.id !== data.session.uid && payload.indirect === false) {
                            AgileToast.toastTask(payload.user_id, record, payload.method);
                        }
                    }
                }
            });
            core.bus.on("project.task:unlink", this, (id, payload) => {
                // TODO: Remove actions, floating buttons, generate overlay with message box telling that task has been deleted
            });
            return this._super();
        },
        addedToDOM() {
            this.$('.tooltipped').tooltip();
            this.$('.collapsible').collapsible();
            this.$(".message-body").expander({
                slicePoint: 140,
                expandEffect: "fadeIn",
                collapseEffect: "fadeOut"
            });
        },

        _onAssignToMeClick() {
            this.taskWidget._model.user_id = data.session.uid;
        },
        _onUnassignClick() {
            this.taskWidget._model.user_id = false;
        },
        _onEditItemClick() {
            let newItemModal = new AgileModals.NewItemModal(this, {
                currentProjectId: this.taskWidget._model.project_id[0],
                focus: "name",
                edit: this.taskWidget._model,
            });
            newItemModal.appendTo($("body"));
        },
        _onAddSubItemClick() {
            let newItemModal = new AgileModals.NewItemModal(this, {
                currentProjectId: this.taskWidget._model.project_id[0],
                parent_id: this.taskWidget._model.id,
            });
            newItemModal.appendTo($("body"));
        },
        _onAddLinkClick() {
            let modal = new AgileModals.LinkItemModal(this, {
                task: this.taskWidget._model,
            });
            modal.appendTo($("body"));
        },
        _onWorkLogClick() {
            let modal = new AgileModals.WorkLogModal(this, {
                task: this.taskWidget._model,
                userId: data.session.uid,
            });
            modal.appendTo($("body"));
        },
        _onAddCommentClick() {
            let modal = new AgileModals.CommentItemModal(this, {
                task: this.taskWidget._model,
            });
            modal.appendTo($("body"));
        },
        _onDelete() {
            dialog.confirm(_t("Delete task"), _t("Are you sure you want to delete this task?"), _t("yes")).done(() => {
                this.taskWidget._model.unlink();
            });
        },
    });

    const WorkflowTransitionsWidget = BaseWidgets.AgileBaseWidget.extend({
        id: "workflow-transition-widget",
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            this._require_obj("taskWidget");
            this.workflowId = this.taskWidget._model.workflow_id[0];
            this.taskStageId = this.taskWidget._model.stage_id[0];
            this.size = this.size || 2;
        },
        willStart() {
            return $.when(this._super(),
                data.cache.get("project.workflow", {id: this.workflowId}).then(workflow => {
                    this.workflow = workflow;
                }),
                data.cache.get("current_user").then(user => {
                    this.current_user = user;
                }));
        },
        renderElement() {
            this._super();
            this.setCurrentStage();
        },
        setSize(size) {
            this.size = size;
            this.setCurrentStage();
        },
        setCurrentStage(stageId) {
            if (stageId) {
                this.taskStageId = stageId;
            }
            this.outTransitions = this.getAllowedTransitions();
            this.renderButtons();
        },
        getAllowedTransitions() {
            return this.workflow.states[this.workflow.stageToState[this.taskStageId]].out_transitions
                .map(transitionId => this.workflow.transitions[transitionId]);
        },
        renderButtons() {
            this.$el.empty();
            if (this.outTransitions.length > this.size + 1) { // This won't fit
                for (let i = 0; i < this.size; i++) {
                    this.$el.append(this.generateButton(this.outTransitions[i]));
                }
                // TODO: Generate dropdown!
                let overflow = this.outTransitions.slice(this.size);
                this.$el.append(this.generateOverflow(overflow));
                this.$('.dropdown-button').dropdown();
            }
            else { // This will fit
                this.outTransitions.forEach(trId => {
                    this.$el.append(this.generateButton(trId));
                })
            }
        },
        generateButton(transition, overflow) {
            let newState = this.workflow.states[transition.dst];
            let button = overflow ? this.renderOverflowElement(transition.name) : this.renderButton(transition.name);
            button.click(() => {
                if (transition.user_confirmation) {
                    this.openStageChangeModal(newState.stage_id, newState.name, this.taskWidget, () => {
                        this.updateStage(newState);
                    });
                    return;
                } else {

                    this.taskWidget._model.stage_id = newState.stage_id;
                    this.updateStage(newState);
                }
            });
            return button;
        },
        generateOverflow(overflow) {
            let wrapper = $("<div style='display: inline-block;'/>");
            wrapper.append($("<a class='dropdown-button btn' data-activates='workflow-transition-widget-overflow'>...<i class='mdi mdi-chevron-down'/></a>"));
            let list = $("<ul id='workflow-transition-widget-overflow' class='dropdown-content'>");
            wrapper.append(list);
            overflow.forEach(trId => {
                let elem = $("<li/>");
                elem.append(this.generateButton(trId, true));
                list.append(elem);
            });
            return wrapper;
        },
        renderButton(text) {
            return $("<a class='waves-effect waves-light btn'>" + text + "</a>");
        },
        renderOverflowElement(text) {
            return $("<a class='waves-effect waves-light'>" + text + "</a>");
        },
        updateStage(state) {
            this.setCurrentStage(state.stage_id);
        },
        openStageChangeModal(newStageId, newStateName, taskWidget, confirmedCallback) {
            let userName = false;

            if (taskWidget._model.user_id) {
                if (taskWidget._model.user_id instanceof Array) {
                    userName = taskWidget._model.user_id[1];
                } else {
                    userName = taskWidget._model.user_id.name;
                }
            }

            let modal = new AgileModals.TaskStageConfirmationModal(this, {
                taskId: taskWidget.id,
                stageId: newStageId,
                stageName: newStateName,
                // userId: taskWidget._model.user_id ? taskWidget._model.user_id.id : false,
                userName: userName,
                afterHook: (comment, confirmation, form) => {

                    // confirmedCallback();
                }
            });
            modal.appendTo($("body"));
        },
        addedToDOM() {
            this._super();
            this.$('.dropdown-button').dropdown();
        },
    });

    return {
        TaskView,
        WorkflowTransitionsWidget
    };

});
