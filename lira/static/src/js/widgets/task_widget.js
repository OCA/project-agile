// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.widget.task', function (require) {
    "use strict";
    const data = require('lira.data');
    const ModelList = require('lira.model_list');
    const AbstractModelList = require('lira.abstract_model_list');
    const BaseWidgets = require('lira.BaseWidgets');
    const TaskLinks = require('lira.widget.task.links').TaskLinks;
    const AgileModals = require('lira.widget.modal');
    const helpers = require('lira.helpers');
    const Attachments = require('lira.attachments');
    const DataServiceFactory = require('lira.data_service_factory');
    const web_core = require("web.core");
    const _t = web_core._t;
    const dialog = require('lira.dialog');
    const mixins = require('lira.mixins');
    const ActivityStream = require('lira.activity_stream').ActivityStream;

    const TimeSheetListItem = AbstractModelList.AbstractModelListItem.extend({
        template: "lira.task.timesheets.line",
        removeConfirmation: {
            title: _t("Delete worklog"),
            message: _t("Are you sure that you want to delete this workflow?"),
            okText: _t("Yes")
        },
        init(parent, options) {
            this._super(parent, options);
            this.formated_time = helpers.time.format(this.record.unit_amount);
        },
        canEdit() {
            return this.record.user_id[0] === data.session.uid;
        },
        addedToDOM() {
            this._super();
            this.$('.tooltipped').tooltip({delay: 50});
        },
        start() {
            this.$(".remove-timesheet").click(this.remove.bind(this));
            this.$(".edit-timesheet").click(() => {
                //let oldUnitAmount = this.record.unit_amount;
                var modal = new AgileModals.WorkLogModal(this, {
                    task: this.task,
                    userId: data.session.uid,
                    edit: this.record,
                });
                modal.appendTo($("body"));
            });
            return this._super();
        },

        updateWorklog(worklog) {
            let oldUnitAmount = this.record._previous.unit_amount;
            this.formated_time = helpers.time.format(this.record.unit_amount);
            this.$(".formated_time").text(this.formated_time);
            this.$(".date").text(this.record.date);
            this.$(".name").text(this.record.name);
            this.trigger_up("worklog_updated", {ammount: this.record.unit_amount - oldUnitAmount});
        },
    });
    TimeSheetListItem.sort_by = "date";
    const TaskWidget = BaseWidgets.DataWidget.extend(mixins.MenuItemsMixin, {
        _name: "TaskWidget",
        template: "lira.task",
        menuItems: [
            {
                class: "assign-to-me",
                icon: "mdi-account-check",
                text: _t("Assign To Me"),
                callback: '_onAssignToMeClick',
                sequence: 1,
                hidden() {
                    return this.data_service.getRecord(this.id)
                        .then(task => task.user_id && task.user_id[0] == data.session.uid)
                },
            },
            {
                class: "unassign",
                icon: "mdi-account-minus",
                text: _t("Unassign"),
                callback: '_onUnassignClick',
                sequence: 2,
                hidden() {
                    return this.data_service.getRecord(this.id)
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
                    return this.data_service.getRecord(this.id)
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
                text: _t("Delete"),
                callback: '_onDelete',
                sequence: 8,
            },
        ],
        init(parent, options) {
            mixins.MenuItemsMixin.init.call(this);
            this.data_service = DataServiceFactory.get("project.task", false);
            this._super(parent, options);
            this.taskLinksWidget = new TaskLinks(this, {
                task_id: this.id
            });
            this.helpers = helpers;
        },
        isBeingEdited() {
            return this._model._edit("check");
        },
        startEditing() {
            this.editingPromise = $.Deferred();
            this._model._edit(this.editingPromise);
        },
        stopEditing(writed = true) {
            writed ? this.editingPromise.resolve() : this.editingPromise.reject();
        },
        willStart() {
            let superPromise = this._super();
            this.subtasksPromise = $.Deferred();
            this.timesheetsPromise = $.Deferred();
            this.tagsPromise = $.Deferred();
            this.attachmentsPromise = $.Deferred();
            this.commentsPromise = data.getMessages("project.task", this.id, ["comment", "email", "notification"]);
            superPromise.then(() => {
                this.data_service.getRecords(this._model.child_ids)
                    .then(this.subtasksPromise.resolve, this.subtasksPromise.reject);

                DataServiceFactory.get("account.analytic.line").getRecords(this._model.timesheet_ids)
                    .then(this.timesheetsPromise.resolve, this.timesheetsPromise.reject);

                if (this._model.tag_ids.length > 0) {
                    data.getDataSet("project.tags")
                        .read_ids(this._model.tag_ids, ["name", "color"])
                        .then(this.tagsPromise.resolve, this.tagsPromise.reject);
                } else {
                    this.tagsPromise.reject();
                }
                data.getDataSet("ir.attachment").read_ids(this._model.attachment_ids, ["name", "datas_fname", "local_url", "create_uid", "create_date", "mimetype"])
                    .then(this.attachmentsPromise.resolve, this.attachmentsPromise.reject);
            });

            return superPromise.then(() => {
                return DataServiceFactory.get("project.task.type2").getRecord(this._model.type_id[0]).then(task_type => {
                    this.task_type = task_type;
                })
            });
        },
        renderElement() {
            this.project_image = data.getImage("project.project", this._model.project_id[0], this._model.project_last_update);
            this._super();

            this.subtasksPromise.then(result => {
                this.subtaskList = new AbstractModelList.ModelList(this, {
                    template: "lira.backlog.task_list",
                    model: "project.task",
                    ModelItem: ModelList.SimpleTaskItem,
                    itemExtensions: {
                        template: "lira.task.task_widget_task_item",
                    },
                    _name: "Task Sub-tasks",
                    data: result,
                    attributes: {"data-id": this.id},
                });
                this.subtaskList.appendTo(this.$(".collapsible li.subtasks .collapsible-body"));
                if (result.length < 1) {
                    this.$(".collapsible li.subtasks").hide();
                }

            });
            this.tagsPromise.then(result => {
                let tagContainer = this.$("[data-field='tag_ids']");
                for (let tag of result) {
                    tagContainer.append($(`<span class="tag o_tag_color_${tag.color}">${tag.name}</span>`))
                }
                this.$("[data-field-name='tag_ids']").show();

            });

            this.timesheetsPromise.then(result => {
                this.timesheetList = new AbstractModelList.ModelList(this, {
                    _name: "Task Timesheets",
                    template: "lira.task.timesheets",
                    model: "account.analytic.line",
                    custom_events: {
                        remove_item: function (evt) {
                            // let itemWidget = this.list.get(evt.data.id);
                            this.trigger_up("worklog_updated", {ammount: evt.data.itemData.unit_amount * -1});
                            // evt.stopPropagation();
                            this.removeItem(evt.data.id, true, true);
                        }
                    },
                    ModelItem: TimeSheetListItem,
                    itemExtensions: {
                        task: this._model,
                    },
                    data: result,
                    attributes: {"data-id": this.id}
                });
                this.timesheetList.appendTo(this.$(".collapsible li.timesheets .collapsible-body"));
                if (result.length < 1) {
                    this.$(".collapsible li.timesheets").hide();
                }

            });
            this.activityStream = new ActivityStream(this, {
                showMessageName: true,
                task_ids:[this.id]
            });
            this.activityStream.appendTo(this.$(".collapsible li.comments .collapsible-body"));
            // this.commentsPromise.then(messages => {
            //     this.messagesData = messages;
            //     this.commentsList = new AbstractModelList.ModelList(this, {
            //         _name: "Task Comments",
            //         className: "activity",
            //         model: "mail.message",
            //         ModelItem: ModelList.MessageItem,
            //         custom_events: {
            //             remove_item: function (evt) {
            //                 this.removeItem(evt.data.id);
            //                 this.trigger_up("comment_removed");
            //             }
            //         },
            //         itemExtensions: {
            //             taskModel: this._model,
            //         },
            //         data: messages,
            //         attributes: {"data-id": this.id},
            //     });
            //     this.commentsList.appendTo();
            //
            //     if (messages.length < 1) {
            //         this.$(".collapsible li.comments").hide();
            //     }
            // });
            this.taskLinksWidget.appendTo(this.$(".collapsible li.links .collapsible-body"));
            this.taskLinksWidget._is_rendered.then(() => {
                if (this.taskLinksWidget.links.length > 0) {
                    this.$(".collapsible li.links").show();
                }
            });
            this.attachmentsPromise.then(attachments => {
                this.attachmentsData = attachments;
                let placeholderNode = this.$(".collapsible li.attachments .collapsible-body");
                this.attachmentsWidget = new Attachments.AttachmentsWidget(this, {
                    attachments,
                    res_id: this.id,
                    res_model: "project.task"
                });
                this.attachmentsWidget.appendTo(placeholderNode);
            });
            this.task_type.allow_story_points || this.$("[data-field-name=story_points]").hide();
            this._model.date_deadline || this.$("[data-field-name=date_deadline]").hide();
            this._model.planned_hours || this.$("[data-field-name=planned_hours]").hide();
            this._model.resolution_id || this.$("[data-field-name=resolution_id]").hide();

        },
        start() {
            mixins.MenuItemsMixin.start.call(this);
            if (this.isQuickDetailView) {
                // Add range slider for resizing panels
                this.trigger_up("init_action_menu", {
                    items: el => {
                        var slider = $('<div id="right-slide-controller"><input type="text" name="Right part width" value=""/></div>');
                        slider.appendTo(el);
                        let values = ["15/85", "30/70", "50/50", "70/30", "85/15"];
                        var from = 0;
                        if ($(".slide-wrapper .slide-part")[0].style.flexGrow) {
                            for (from = 0; !values[from].startsWith(($(".slide-wrapper .slide-part")[0].style.flexGrow).toString()); from++) ;
                        } else {
                            from = 2;
                        }
                        slider.find("input").ionRangeSlider({
                            values,
                            from,
                            grid: false,
                            hide_min_max: true,
                            hide_from_to: true,
                            onChange(data) {
                                $(".slide-wrapper .slide-part")[0].style.flexGrow = parseInt(data.from_value.split("/")[0]);
                                $(".slide-wrapper .slide-part")[1].style.flexGrow = parseInt(data.from_value.split("/")[1]);
                            },
                        });
                        let removeActionMenu = $.Deferred();
                        this._destroyed.promise().then(() => {
                            slider.remove();
                            removeActionMenu.resolve(this)
                        });
                        return removeActionMenu.promise();
                    }
                });
                this.$(".task-key").click(e => {
                    var taskId = $(e.currentTarget).attr("task-id");
                    hash_service.setHash("task", taskId, false);
                    hash_service.setHash("view", "task", false);
                    hash_service.setHash("page", "board");
                });
            }
            this._is_added_to_DOM.then(() => {
                this.$('.collapsible').collapsible();
                this.$('.dropdown-button').dropdown();
                this.$('.dropify').dropify();
            });
            // Make fields updateable
            this.$(".we").on('click', function () {
                var input = $('<input />', {
                    'type': 'text',
                    'name': 'unique',
                    'value': $(this).find('span').html()
                });
                var saveDiscardSpan = $('<span class="we-save-discard"><i class="mdi mdi-check"></i><i class="mdi mdi-close"></i></span>');
                $(this).empty().append(input).append(saveDiscardSpan);
                input.focus();
                input.blur(function () {
                    $(this).parent().empty().append($('<span />').html($(this).val()));
                });
            });


            this.$(".card-close").click(() => this.destroy(true));
            this.$("#task-description .btn-edit").click(this.editDescription.bind(this));
            this.$("#task-description .btn-save").hide().click(this.saveDescription.bind(this));
            this.$("#task-description .btn-discard").hide().click(this.discardDescription.bind(this));
            if (!(this._model.effective_hours && this._model.effective_hours > 0)) {
                this.$("[data-field-name=effective_hours]").hide();
            }
            if (!(this._model.planned_hours && this._model.planned_hours > 0)) {
                this.$("[data-field-name=planned_hours]").hide();
            }
            if (!this._model.date_deadline) {
                this.$("[data-field-name=date_deadline]").hide();
            }
            window.task = this;
            return this._super();
        },
        editDescription() {
            this.startEditing();
            this.originalDescription = this.$('.materialnote').html();
            this.$('.materialnote').materialnote({
                height: 100,
                defaultBackColor: '#fff',
                focus: true
            });
            this.$("#task-description .btn-edit").hide();
            this.$("#task-description .btn-save").show();
            this.$("#task-description .btn-discard").show();
        },
        saveDescription() {
            this.stopEditing(false);
            var description = this.$('.materialnote').code();
            this._model.description = description;
            this.$('.materialnote').destroy();
            this.$("#task-description .btn-edit").show();
            this.$("#task-description .btn-save").hide();
            this.$("#task-description .btn-discard").hide();
        },
        discardDescription() {
            this.$('.materialnote').code(this.originalDescription);
            delete this.originalDescription;
            this.$('.materialnote').destroy();
            this.$("#task-description .btn-edit").show();
            this.$("#task-description .btn-save").hide();
            this.$("#task-description .btn-discard").hide();
            this.stopEditing();
        },
        highlightNewWidget(newWidget) {
            newWidget._is_added_to_DOM.then(() => {
                this.$el.parent().scrollToElement(newWidget.$el);
                newWidget.$el.highlight();
            });
        },
        removeParent() {
            this.$(".parent-key").hide();
        },
        _onAssignToMeClick() {
            this._model.user_id = data.session.uid;
        },
        _onUnassignClick() {
            this._model.user_id = false;
        },
        _onEditItemClick() {
            let newItemModal = new AgileModals.NewItemModal(this, {
                currentProjectId: this._model.project_id[0],
                edit: this._model,
            });
            newItemModal.appendTo($("body"));
        },
        _onAddSubItemClick() {
            var newItemModal = new AgileModals.NewItemModal(this, {
                currentProjectId: this._model.project_id[0],
                parent_id: this._model.id,
            });
            newItemModal.appendTo($("body"));
        },
        _onAddLinkClick() {
            var modal = new AgileModals.LinkItemModal(this, {
                task: this._model,
            });
            modal.appendTo($("body"));
        },
        _onWorkLogClick() {
            var modal = new AgileModals.WorkLogModal(this, {
                task: this._model,
                userId: data.session.uid,
            });
            modal.appendTo($("body"));
        },
        _onAddCommentClick() {
            var modal = new AgileModals.CommentItemModal(this, {
                task: this._model,
            });
            modal.appendTo($("body"));
        },
        _onDelete() {
            dialog.confirm(_t("Delete task"), _t("Are you sure you want to delete this task?"), _t("yes")).done(() => {
                this._model.unlink();
            });
        },
    });


    return {
        TaskWidget,
        TimeSheetListItem
    };
});
