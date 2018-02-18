// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.widget.task.links', function (require) {
    "use strict";
    var data = require('lira.data');
    var ModelList = require('lira.model_list');
    var BaseWidgets = require('lira.BaseWidgets');

    let LinkGroupWidget = BaseWidgets.AgileBaseWidget.extend({
        template: "lira.task.link.group",
        _name: "LinkGroupWidget",
        custom_events: {
            'remove_link': function (evt) {
                if (this.removeLink(evt.data.id)) {
                    evt.stopPropagation();
                }
            }
        },
        init(parent, options) {
            this._super(parent, options);
            Object.assign(this, options);
            this._require_prop("relation");
            this._require_prop("links");
            this.taskLinkList = new ModelList.ModelList(this, {
                model: "project.task",
                ModelItem: ModelList.SimpleTaskItem,
                itemExtensions: {
                    template: "lira.task.task_widget_task_item",
                    remove: function (e) {
                        let id = $(e.target).getDataFromAncestor("linkId");
                        this.trigger_up("remove_link", {id});
                    }
                },
                _name: "Link Group Widget",
                data: this.links,
                attributes: {"data-relation-name": this.relation}
            });
        },
        renderElement() {
            this._super();
            this.taskLinkList.appendTo(this.$(".collection"));
        },
        addLink(link) {
            this.links.push(link);
            return this.taskLinkList.addItem(link.related_task, {"data-link-id": link.id});
        },
        removeLink(id) {
            let link = this.links.find(link => link.id == id);
            if (!link) {
                return false;
            }
            this.links = this.links.filter(link => link.id != id);
            data.getDataSet("project.task.link").unlink([link.id]).then(() => {
                this.taskLinkList.removeItem(link.related_task.id);
                if (this.links.length < 1) {
                    this.$el.hide();
                    this.trigger_up("remove_link", {id});
                }
            });
        }
    });

    var TaskLinks = BaseWidgets.AgileBaseWidget.extend({
        _name: "TaskLinks",
        init(parent, options) {
            this._super(parent, options);
            Object.assign(this, options);
            this._require_prop("task_id");
        },
        willStart() {
            return this._super().then(() => {
                // Get all links
                let linksPromise = data.getTaskLinks(this.task_id)
                    .then(links => {
                        this.links = links;
                    });
                // Get relation name to order map;
                let relationsPromise = data.cache.get("project.task.link.relation.nameOrderMaps")
                    .then((nameToOrderMap, orderToNameMap) => {
                        this.nameToOrderMap = nameToOrderMap;
                        this.orderToNameMap = orderToNameMap;
                    });
                return $.when(linksPromise, relationsPromise);
            });
        },
        renderElement() {
            this._super();
            this.groups = window.groups = new Map();
            // render empty lists
            for (let relationOrder of [...this.orderToNameMap.keys()].sort()) {
                let relation = this.orderToNameMap.get(relationOrder);
                let linkGroup = new LinkGroupWidget(this, {
                    relation,
                    links: []
                });
                this.groups.set(relation, linkGroup);
                linkGroup.appendTo(this.$el);
                linkGroup.$el.hide();
            }
            for (let link of this.links) {
                this.addLink(link, false);
            }
        },
        addLink(link, addToList = true) {
            //Since render element calls this method, avoid infinite loop
            if (addToList) {
                this.links.push(link);
            }
            let linkGroup = this.groups.get(link.relation_name);
            linkGroup.$el.show();
            return linkGroup.addLink(link);

        }

    });

    return {
        TaskLinks,
        LinkGroupWidget
    };
});
