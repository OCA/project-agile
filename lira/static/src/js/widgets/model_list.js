// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.model_list', function (require) {
    "use strict";
    const data = require('lira.data');
    const AbstractModelList = require('lira.abstract_model_list');
    const AgileModals = require('lira.widget.modal');
    const core = require("web.core");
    const _t = core._t;
    const hash_service = require('lira.hash_service');

    const SimpleTaskItem = AbstractModelList.AbstractModelListItem.extend({
        _name: "SimpleTaskItem",
        template: "lira.task.simple_task_item",
        image_url() {
            return this.record.user_id ? data.getImage("res.users", this.record.user_id[0], this.user_last_update) : "/lira/static/img/unassigned.png";
        },
        image_tooltip() {
            return this.record.user_id ? this.record.user_id[1] : _t("Unassigned");
        },
        willStart() {
            return $.when(this._super(), data.cache.get("current_user").then(user => {
                this.currentUser = user;
            }), DataServiceFactory.get("project.task.type2").getAllRecords(true).then(task_types => {
                if (Number.isInteger(this.record)){
                    return DataServiceFactory.get("project.task").getRecord(this.record).then(record => {
                        this.record = record;
                        this.task_type = task_types.get(this.record.type_id[0]);
                    });
                } else {
                    this.task_type = task_types.get(this.record.type_id[0]);
                }
            }));
        },
        start() {
            this.$(".task-key").click(e => {
                e.preventDefault();
                e.stopPropagation();
                let taskId = $(e.currentTarget).attr("task-id");
                hash_service.setHash("task", taskId);
                hash_service.setHash("view", "task");
                hash_service.setHash("page", "board");
            });
            if (typeof this.remove === "function") {
                this.$(".remove-item").click(this.remove.bind(this));
            }
            return this._super();
        },
        addedToDOM() {
            this._super();
            this.$('.tooltipped').tooltip({delay: 50});
        },
        removeParent() {
            this.$(".parent-key").hide();
        }
    });
    SimpleTaskItem.sort_by = "agile_order";

    const MessageItem = AbstractModelList.AbstractModelListItem.extend({
        _name: "MessageItem",
        template: "lira.task.comment",
        init(parent, options) {
            this._super(parent, options);
            this._require_obj("taskModel", ["id", "key", "name"]);
        },

         willStart() {
            return $.when(this._super(), data.cache.get("current_user").then(user => {
                this.currentUser = user;
            }));
        },
        image_url() {
            return  data.getImage("res.partner", this.record.author_id[0], this.record.author_last_update);
        },
        addedToDOM() {
            this._super();
            this.$('.tooltipped').tooltip({delay: 50});
        },
        canEdit() {
            return this.currentUser.partner_id[0] == this.record.author_id[0];
        },
        renderElement() {
            this._super();
            if (this.record.date != this.record.write_date) {
                this.setWriteDate();
            }
        },
        setWriteDate() {
            this.$(".activity-item-write-date").remove();
            let tooltipString = this.record.author_id[1] + _t(" at ") + this.record.write_date;
            let writeDateNode = $('<span class="activity-item-write-date tooltipped" data-position="bottom" data-delay="50" data-tooltip="' + tooltipString + '"/>');
            writeDateNode.insertAfter(this.$(".activity-item-date"));
            writeDateNode.tooltip();
        },
        start() {
            this.$(".remove-activity").click(this.remove.bind(this));
            this.$(".edit-activity").click(() => {
                let modal = new AgileModals.CommentItemModal(this, {
                    task: this.taskModel,
                    edit: this.record,
                    afterHook: comment => {
                        Object.assign(this.record, comment);
                        this.$(".activity-body").html(comment.body);
                        this.setWriteDate();
                    }
                });
                modal.appendTo($("body"));
            });
        }
    });
    MessageItem.sort_by = "date";
    MessageItem.reverse = true;


    return {
        SimpleTaskItem,
        MessageItem
    };
});
