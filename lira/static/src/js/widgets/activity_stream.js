// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.activity_stream', function (require) {
    "use strict";

    const data = require('lira.data');
    const AgileBaseWidget = require('lira.BaseWidgets').AgileBaseWidget;
    const DataServiceFactory = require('lira.data_service_factory');
    const AgileModals = require('lira.widget.modal');
    const core = require("web.core");
    const dialog = require('lira.dialog');
    const mixins = require("lira.mixins");

    const _t = core._t;
    const qweb = core.qweb;

    const ActivityStreamItem = AgileBaseWidget.extend(mixins.MenuItemsMixin, {
        template: "lira.activity.item",
        timeFormat: {
            sameDay: '[Today at] HH:MM',
            lastDay: '[Yesterday at] HH:MM',
            lastWeek: 'dddd [at] HH:MM',
            sameElse: 'DD/MM/YYYY [at] HH:MM'
        },
        menuItemsContainer: ".activity-actions",
        menuItems: [{
            class: "edit-activity",
            icon: "mdi-pencil",
            hidden: "hideEditing",
            callback: "_onEditActivityClick",
        }, {
            class: "remove-activity",
            icon: "mdi-delete",
            hidden: "hideEditing",
            callback: "_onRemoveActivityClick",
        }],
        init(parent, options) {
            this._super.apply(this, arguments);
            Object.assign(this, options);
            mixins.MenuItemsMixin.init.call(this);
        },
        start() {
            mixins.MenuItemsMixin.start.call(this);
            return this._super();
        },
        willStart() {
            return $.when(this._super(), DataServiceFactory.get(this.message.model).getRecord(this.message.res_id).then(record => {
                this.record = record;
            }));
        },
        canEdit() {
            return this.user.partner_id[0] == this.message.author_id[0];
        },
        hideEditing() {
            return !this.canEdit();
        },
        formatTime(time) {
            return moment(time).calendar(null, this.timeFormat);
        },
        setWriteDate() {
            this.$(".activity-item-write-date").remove();
            let tooltipString = this.message.author_id[1] + _t(" at ") + this.message.write_date;
            let writeDateNode = $('<span class="activity-item-write-date tooltipped" data-position="bottom" data-delay="50" data-tooltip="' + tooltipString + '"/>');
            writeDateNode.insertAfter(this.$(".activity-item-date"));
            writeDateNode.tooltip();
        },
        _onEditActivityClick() {
            let modal = new AgileModals.CommentItemModal(this, {
                task: this.record,
                edit: this.message,
                afterHook: comment => {
                    Object.assign(this.message, comment);
                    this.$(".activity-body").html(comment.body);
                    this.setWriteDate();
                }
            });
            modal.appendTo($("body"));
        },
        _onRemoveActivityClick(e) {
            let id = $(e.currentTarget).getDataFromAncestor("object-id");
            dialog.confirm(_t("Are you sure?"), _t("You are about to delete the message!"), _t("Yes, delete"), _t("Cancel")).done(() => {
                data.getDataSet("mail.message").unlink([id]).then(() => {
                    this.trigger_up("activity_deleted", {id});
                    this.destroy();
                });
            });
        }
    });

    const ActivityStream = AgileBaseWidget.extend({
        Item: {Item: ActivityStreamItem},
        _name: "ActivityStream",
        template: "lira.activity.stream",
        limit: 8,
        loadMoreStep: 8,
        emptyPlaceholder: $("<div>" + _t("There are no activities.") + "</div>"),
        showMessageName: false,
        groupWeekDayFormat: {
            sameDay: '[Today]',
            lastDay: '[Yesterday]',
            lastWeek: 'dddd',
            sameElse: '[Older]'
        },
        events: {
            "click .load-more-btn": "_onLoadMoreClick",
            "click .activity-object": "_onActivityObjectClick",
        },

        custom_events: {
            "activity_deleted": "_onActivityDeleted"
        },
        init(parent, options) {
            this._super(parent, options);
            Object.assign(this, options);
            this.itemWidgets = [];
            window.as = this;
        },
        willStart() {
            return $.when(
                this._super(),
                data.cache.get("current_user").then(user => {
                    this.user = user;
                }),
                data.getMessageSubtypes("project.task").then(subtypes => {
                    this.subtypes = subtypes;
                    this.subtype_ids = subtypes.map(e => e.id);
                })
            )
        },
        loadData() {
            return data.session.rpc("/lira/activity-stream", {
                subtype_ids: this.subtype_ids,
                task_ids: this.task_ids,
                limit: this.limit,
            }).then(messages => {
                if (messages.length == 0) {
                    this.$el.addClass("empty");
                }
                this.prepareMessages(messages);
                this.itemWidgets.forEach(item => {
                    item.destroy();
                });
                this.itemWidgets = [];
                this.$(".activity").empty();
                this.renderItems();
            });
        },
        prepareMessages(messages) {
            this.messages = messages;
            this.groupWeekDays = new Map();
            this.lastMessage = {};

            this.messages.forEach(m => {
                let weekday = this.formatGroupWeekDay(m.date);
                this.groupWeekDays.has(weekday) ?
                    this._isSameAuthor(m, this.lastMessage) ? this.lastGroup.push(m) : this.groupWeekDays.get(weekday).push(this.lastGroup = [m]) :
                    this.groupWeekDays.set(weekday, [this.lastGroup = [m]]);
                this.lastMessage = m;
            });
        },
        renderItems() {
            this.$(".list-preloader").hide();
            if (this.groupWeekDays.size) {
                this.$el.removeClass("empty");
            }
            if (this.messages.length > 0 && this.limit <= this.messages.length) {
                this.$(".load-more-btn").show();
            } else {
                this.$(".load-more-btn").hide();
            }
            console.log(this.groupWeekDays);
            for (let [weekdayGroup, activityGroups] of this.groupWeekDays.entries()) {
                this.$(".activity").append($(`<div class="activity-date">${weekdayGroup}</div>`));
                for (let activityGroup of activityGroups) {
                    let author = this.getAuthor(activityGroup[0]);
                    let groupNode = $(qweb.render("lira.activity.group", {author}));
                    this.$(".activity").append(groupNode);
                    let groupContentNode = groupNode.find(".activity-group-content");
                    for (let message of activityGroup) {
                        let itemWidget = new this.Item.Item(this, {
                            message,
                            user: this.user,
                            showMessageName: this.showMessageName,
                        });
                        itemWidget.appendTo(groupContentNode);
                        this.itemWidgets.push(itemWidget);
                    }
                }

            }
        },
        renderElement() {
            this._super();
            this.$(".load-more-btn").hide();
            if (this.emptyPlaceholder) {
                this.emptyPlaceholder.addClass("empty-placeholder");
                this.$el.append(this.emptyPlaceholder);
            }
            this.loadData();
        },
        start() {
            this.$(".message-body").expander({
                slicePoint: 140,
                expandEffect: "fadeIn",
                collapseEffect: "fadeOut"
            });
        },
        getAuthor(message) {
            return {
                name: message.author_id[1],
                image: data.getImage("res.partner", message.author_id[0])
            }
        },
        formatGroupWeekDay(time) {
            return moment(time).calendar(null, this.groupWeekDayFormat);
        },
        getActivityType(message) {

            //TODO: Rewrite and add support for multilanguage.
            let isCommit = message.subtype_id && message.subtype_id[1] === "Code committed";
            let isComment = message.message_type === "comment";
            return {
                subtype: message.subtype_id && {
                    id: message.subtype_id[0],
                    name: message.subtype_id[1]
                },
                isCommit,
                message: isCommit ? "Code pushed" :
                    isComment ? "commented" :
                        message.subtype_id ? message.subtype_id[1] : "commented"
            }
        },
        _isSameAuthor(m1, m2) {
            if (m1.author_id[0] == 0 && m2.author_id[0] == 0)
                return m1.author_id[1] === m2.author_id[1];
            return m1.author_id[0] == m2.author_id[0];
        },
        _onLoadMoreClick() {
            this.$(".list-preloader").show();
            this.limit += this.loadMoreStep;
            this.loadData();
        },
        _onActivityDeleted(evt) {

        },
        _onActivityObjectClick(e) {
            let model = $(e.currentTarget).getDataFromAncestor("object-model");
            let res_id = $(e.currentTarget).getDataFromAncestor("object-res-id");
            if (model === "project.task") {
                hash_service.setHash("task", res_id);
                hash_service.setHash("view", "task");
                hash_service.setHash("page", "board");
            }
        }
    });

    return {
        ActivityStream,
        ActivityStreamItem,
    };
});
