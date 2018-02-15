// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.view.task', function (require) {
    "use strict";
    const data = require('project_agile.data');
    const DataServiceFactory = require('project_agile.data_service_factory');
    const BaseWidgets = require('project_agile.BaseWidgets');
    const hash_service = require('project_agile.hash_service');
    const TaskWidget = require('project_agile.widget.task').TaskWidget;
    const AgileModals = require('project_agile.widget.modal');
    const AgileToast = require('project_agile.toast');
    const core = require('project_agile.core');
    const web_core = require('web.core');
    const qweb = web_core.qweb;
    const _t = web_core._t;

    var TaskView = BaseWidgets.AgileViewWidget.extend({
        title: "Task View",
        _name: "TaskView",
        template: "project.agile.view.task",
        init(parent, options) {
            this._super(parent, options);
            this.taskId = parseInt(hash_service.get("task"));
            if (!this.taskId) {
                throw new Error(_t("Task id must be set in Task view"));
            }
            this.renderTask();
            hash_service.on("change:task", this, (hash_service, options) => this.loadTask(parseInt(hash_service.get("task"))));
            this.prepareDataForModals();
        },
        prepareDataForModals() {
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
                template: "project.agile.view.task_widget",
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
            let title = $(qweb.render("project.agile.view.task.title", {widget: this.taskWidget}));
            title.find(".task-key").click(e => {
                var taskId = $(e.currentTarget).attr("task-id");
                hash_service.setHash("task", taskId);
                hash_service.setHash("view", "task");
                hash_service.setHash("page", "board");
            });
            this.setTitle(title, this.taskWidget.name);
            this.taskWidget.$el.responsive();
            if (this.taskWidget._model.user_id && this.taskWidget._model.user_id[0] == data.session.uid) {
                this.$(".assign-to-me").hide();
            } else {
                this.$(".assign-to-me").show();
            }
            if (this.taskWidget.task_type.allow_sub_tasks) {
                this.$(".add-sub-item").show();
            } else {
                this.$(".add-sub-item").hide();
            }

            if (this.workflowTaskWidget) {
                this.workflowTaskWidget.destroy();
            }

            window.wtw = this.workflowTaskWidget = new WorkflowTransitionsWidget(this, {
                taskWidget: this.taskWidget
            });
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
            this.$(".edit-item").click(() => {
                let taskView = this;
                data.cache.get("current_user").then(user => {
                    data.cache.get("projects_in_board", {
                        id: parseInt(hash_service.get("board")),
                        team_id: user.team_id[0]
                    }).then(projectsMap => {
                        var newItemModal = new AgileModals.NewItemModal(this, {
                            currentProjectId: taskView.taskWidget._model.project_id[0],
                            focus: "name",
                            edit: taskView.taskWidget._model,
                        });
                        newItemModal.appendTo($("body"));
                    });
                });
            });
            this.$(".work-log").click(() => {
                let taskView = this;
                var modal = new AgileModals.WorkLogModal(this, {
                    task: this.taskWidget._model,
                    userId: data.session.uid,
                    afterHook: workLog => {
                        // Here we should update right side widget
                        taskView.taskWidget.addWorkLog(workLog);
                    }
                });
                modal.appendTo($("body"));

            });
            this.$(".add-link").click(() => {
                let taskView = this;
                var modal = new AgileModals.LinkItemModal(this, {
                    task: this.taskWidget._model,
                    // task: {id: this.taskWidget._model.id, key: this.taskWidget._model.key, name: this.taskWidget._model.name},
                    afterHook: (result) => {
                        taskView.taskWidget.addLink(result);
                    }
                });
                modal.appendTo($("body"));
            });
            this.$(".add-comment").click(() => {
                let taskView = this;

                var modal = new AgileModals.CommentItemModal(this, {
                    task: this.taskWidget._model,
                    // task: {id: this.taskWidget._model.id, key: this.taskWidget._model.key, name: this.taskWidget._model.name},
                    afterHook: (comment) => {
                        taskView.taskWidget.addComment(comment);
                    }
                });
                modal.appendTo($("body"));

            });
            this.$(".add-sub-item").click(() => {
                let taskView = this;
                let newItemModal = new AgileModals.NewItemModal(taskView, {
                    currentProjectId: this.taskWidget._model.project_id[0],
                    parent_id: this.taskWidget._model.id,
                    // afterHook: taskId => {
                    //     DataServiceFactory.get("project.task").getRecord(taskId).then(task => {
                    //         taskView.taskWidget.addSubTask(task);
                    //     });
                    // }
                });
                newItemModal.appendTo($("body"));

            });
            this.$(".assign-to-me").click(() => {
                let taskView = this;
                data.getDataSet("project.task").call('write', [[this.taskId], {'user_id': data.session.uid}]).then(() => {
                    data.cache.get("current_user").then(user => {
                        taskView.taskWidget.setAssignee(user, false);
                        this.$(".assign-to-me").hide();
                        // TODO: Raise Updated event.
                    });
                });

            });

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
            //this.$(".message-body").expander({
            //    slicePoint: 140,
            //    expandEffect: "fadeIn",
            //    collapseEffect: "fadeOut"
            //});
        }
    });

    var WorkflowTransitionsWidget = BaseWidgets.AgileBaseWidget.extend({
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
            return $.when(this._super(), data.cache.get("project.workflow", {id: this.workflowId})
                .then(workflow => {
                    this.workflow = workflow;
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
                }
                this.updateStage(newState);
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

            this.taskWidget.setState(state);
            this.setCurrentStage(state.stage_id);
        },
        openStageChangeModal(newStageId, newStateName, taskWidget, confirmedCallback) {
            var userName = false;

            if (taskWidget._model.user_id) {
                if (taskWidget._model.user_id instanceof Array) {
                    userName = taskWidget._model.user_id[1];
                } else {
                    userName = taskWidget._model.user_id.name;
                }
            }

            var modal = new AgileModals.TaskStageConfirmationModal(this, {
                taskId: taskWidget.id,
                stageId: newStageId,
                stageName: newStateName,
                // userId: taskWidget._model.user_id ? taskWidget._model.user_id.id : false,
                userName: userName,
                afterHook: (confirmation, form, comment) => {
                    if (comment) {
                        taskWidget.addComment(comment, false);
                    }
                    confirmedCallback();
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
