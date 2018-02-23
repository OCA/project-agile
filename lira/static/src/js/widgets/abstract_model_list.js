// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.abstract_model_list', function (require) {
    "use strict";
    const data = require('lira.data');
    const AgileContainerWidget = require('lira.BaseWidgets').AgileContainerWidget;
    const AgileBaseWidget = require('lira.BaseWidgets').AgileBaseWidget;
    const Sortable = require('sortable');
    const dialog = require('lira.dialog');
    const crash_manager = require('web.crash_manager');
    const core = require('web.core');
    const _t = core._t;

    //  TODO: This widget took a lot of hits in favour of rest of code and became very bad.
    //  TODO: We decided to write it from scratch. Please be warned that its API might change in near future.
    const ModelList = AgileContainerWidget.extend({
        _name: "ModelList",
        emptyPlaceholder: undefined,
        className: "model-list",
        useDataService: false,
        custom_events: {
            /**
             This event will be triggered after list item has changed parent list.
             change parent will occur on destination list.
             */
            change_parent: '_onChangeParent',
            change_order: '_onChangeOrder',
            remove_item: '_onRemoveItem'
        },
        init(parent, options = {}) {
            Object.assign(this, options);
            this._super(parent, options);
            this._require_prop("model");
            this._require_prop("ModelItem");
            this.getDatasetDefaults(options);
        },
        getDatasetDefaults(options) {
            this.fields = options.fields || this.ModelItem.default_fields || ["name", "agile_order"];
            this.domain = options.domain || [];
            this.context = options.context || [];
            this.offset = options.offset || 0;
            this.limit = options.limit || false;
            this.queryString = options.queryString || "";
            this.dataset = data.getDataSet(this.model);

            if (this.useDataService) {
                this.data_service = DataServiceFactory.get(this.model);
                this.hasCustomFilter = options.domain || options.context || options.offset || options.limit || options.queryString ? true : false;
            }

        },
        loadItems() {
            let def = $.Deferred();
            // If options.data is set, modelList will be created with that data, and it will not fetch data from server.
            if (Array.isArray(this.data)) {
                def.resolve();
            } else if (this.useDataService) {
                if (this.hasCustomFilter) {
                    // TODO: Make this generic. We should be also able to pass contextand offset
                    // TODO: Cache parameters in order to avoid calling id_search every time if criteria didn't change
                    return this.data_service.dataset.id_search(this.queryString, this.domain, 'ilike', this.limit).then(ids => {
                        return this.data_service.getRecords(ids).then(records => {
                            this.data = records;
                            def.resolve();
                        });
                    })
                } else {
                    return this.data_service.getAllRecords().then(records => {
                        this.data = records;
                        def.resolve();
                    });
                }
            } else {
                $.when(this.fields, this.domain, this.offset, this.limit, this.context).then((fields, domain, offset, limit, context) => {
                    this.dataset.read_slice(fields, {
                        domain,
                        offset,
                        limit,
                        context
                    })
                        .then(r => {
                            this.data = r;
                            def.resolve(r);
                        })
                        .fail(e => def.reject(e));
                });
            }
            return def;
        },
        willStart() {
            return $.when(this._super(), this.loadItems());
        },
        addItem(item, attributes) {
            if (typeof item[this.ModelItem.sort_by] === "function") {
                throw new Error("ModelItem doesn't have set sort_by property.")
            }
            if (item._class === "ModelListItem") {
                if (item.id) {
                    this.list.set(item.id, item);
                }
                if (!this.__parentedChildren.find(e => e.id == item.id)) {
                    item.setParent(this);
                    this._appendInOrder(item, item[this.ModelItem.sort_by]);
                }
                this.trigger_up("add_item", {
                    widget: item,
                    itemData: item.record
                });

                return item;
            }
            let widgetOptions = {
                id: item.id,
                record: item,
                attributes: {"data-id": item.id},
                dataset: this.dataset,
                order_field: this.ModelItem.sort_by,
            };
            Object.assign(widgetOptions, this.itemExtensions);
            attributes && Object.assign(widgetOptions.attributes, attributes);
            let modelItem = new this.ModelItem(this, widgetOptions);
            this.list.set(item.id, modelItem);
            this._appendInOrder(modelItem, item[this.ModelItem.sort_by]);
            this.$el.removeClass("empty");
            this.trigger_up("add_item", {widget: modelItem, itemData: item});
            return modelItem;
        },
        removeItem(id, destroy = true, silently = false) {
            let itemWidget = this.list.get(id);
            if (!itemWidget) {
                return false;
            }
            itemWidget.setParent(undefined);
            let itemData = itemWidget.record;
            destroy ? itemWidget.destroy() : itemWidget.$el.detach();
            this.list.delete(id);
            if (!silently) {
                this.trigger_up("remove_item", {itemData});
            }
            if (!this.list.size) {
                this.$el.addClass("empty");
            }
            return true;
        },
        moveToTop(evt) {
            console.log("moving to top", evt);
            let widget_id = $(evt.item).data("id");
            let itemWidget = this.list.get(widget_id);
            // This can happen if task gets deleted/moved to other teams sprint
            if (!itemWidget) {
                return;
            }
            if (evt.oldIndex !== 0) {
                itemWidget.set_order(this.getNewOrder(evt.oldIndex, 0, this.id, true), true);
            }
        },
        moveToBottom(evt) {
            console.log("moving to bottom", evt);
            let widget_id = $(evt.item).data("id");
            let itemWidget = this.list.get(widget_id);
            // This can happen if task gets deleted/moved to other teams sprint
            if (!itemWidget) {
                return;
            }
            if (evt.oldIndex !== this.__parentedChildren.length - 1) {
                itemWidget.set_order(this.getNewOrder(evt.oldIndex, this.__parentedChildren.length - 1, this.id, true), true);
            }
        },
        onDragStart(/**Event*/ evt) {
            try {
                this.trigger_up("drag_start");
            } catch (e) {
                this._handleError(e);
            }
        },
        onDragEnd(/**Event*/ evt) {
            try {
                this.trigger_up("drag_end", {sortableEvent: evt});
                if (evt.defaultPrevented) {
                    return;
                }
                let widget_id = $(evt.item).data("id");
                let itemWidget = this.list.get(widget_id);
                // This can happen if task gets deleted/moved to other teams sprint
                if (!itemWidget) {
                    return;
                }
                let from_list_id = $(evt.from).data("id"); // List from which task is dragged
                let to_list_id = $(evt.to).data("id"); // Destination list on task dragging
                if (from_list_id === to_list_id) {
                    // if list is same, and order is changed, just update order
                    if (evt.oldIndex !== evt.newIndex) {
                        itemWidget.set_order(this.getNewOrder(evt.oldIndex, evt.newIndex, to_list_id, true), true);
                    }
                } else {
                    // If list is changed update both list and order.
                    // Order should be calculated by surrounding items on target list based by ModelItem.sort_by
                    let newListWidget = this._getNewListWidget(to_list_id);

                    itemWidget.set_list(newListWidget, this.getNewOrder(evt.oldIndex, evt.newIndex, to_list_id));
                }
            } catch (e) {
                this._handleError(e);
            }
        },
        renderElement() {
            this._super();
            if (this.emptyPlaceholder) {
                this.emptyPlaceholder.addClass("empty-placeholder");
                this.$el.append(this.emptyPlaceholder);
                this.$el.addClass("empty");
            }
            this.list = new Map();
            for (let item of this.data) {
                this.addItem(item);
            }

            // sortable setup
            if ("sortable" in this && this.sortable) {
                this._is_added_to_DOM.then(() => {
                    // Convert jquery object to HTMLElement and create sortable
                    this.$el.attr("data-sortable", this.sortable.group);
                    Sortable.create(this.$el.get(0), {
                        group: this.sortable.group,
                        onStart: this.onDragStart.bind(this),
                        onEnd: this.onDragEnd.bind(this)
                    });
                });

            }
        },
        _setNewItemList(itemWidget, newListWidget) {
            // TODO: Prevent destroying widget! PS look diff in order to catch up with work
            this.removeItem(itemWidget.id, false);
            newListWidget.addItem(itemWidget);
        },
        getNewOrder(oldIndex, newIndex, new_list_id, sameList = false) {
            // first parent is list, and grandparent is backlog view;
            let itemsInNewList = this._getNewListWidget(new_list_id).__parentedChildren;

            // if list is empty, return one
            if (!itemsInNewList.length) {
                return 1;
            }
            // if moved to first element in list
            if (newIndex == 0) {
                let currentFirstOrder = itemsInNewList[0][this.ModelItem.sort_by];
                return currentFirstOrder > 0 ? currentFirstOrder / 2 : currentFirstOrder - 1;
            }
            //if moved to the end of the same list return agile_order of last element incremented by one.
            if (sameList && newIndex == itemsInNewList.length - 1) {
                return itemsInNewList[newIndex][this.ModelItem.sort_by] + 1;
            }
            // if moved to the end of new list return agile_order of last element incremented by one.
            if (newIndex == itemsInNewList.length) {
                return itemsInNewList[newIndex - 1][this.ModelItem.sort_by] + 1;
            }
            // if item is sorted within the same list, and moved toward the beginning of list, look one element farther
            if (sameList && oldIndex < newIndex) {
                return (itemsInNewList[newIndex][this.ModelItem.sort_by] + itemsInNewList[newIndex + 1][this.ModelItem.sort_by]) / 2;
            }
            return (itemsInNewList[newIndex - 1][this.ModelItem.sort_by] + itemsInNewList[newIndex][this.ModelItem.sort_by]) / 2;

        },
        _getNewListWidget() {
            throw new Error("You must implement this method");
        },
        // Sorts widgets by agile_order on parent widget
        _sortWidgets() {
            if (!this.ModelItem.sort_by && !this.ModelItem.reverse) {
                return;
            }
            let widgets = this.__parentedChildren.sort((a, b) => {
                // If compare value is of type string compare strings, else compare as integer
                return (typeof a[this.ModelItem.sort_by] === "string") ?
                    a[this.ModelItem.sort_by].localeCompare(b[this.ModelItem.sort_by]) :
                    a[this.ModelItem.sort_by] - b[this.ModelItem.sort_by]
            });
            this.__parentedChildren = this.ModelItem.reverse ? widgets.reverse() : widgets;
        },
        // Appends widget acording to agile order. If agile_order is set, widgets will be sorted again
        _appendInOrder(itemWidget, order) {
            if (order !== undefined) {
                itemWidget[this.ModelItem.sort_by] = order;
                this._sortWidgets();
            }
            // if widget is already in dom, then new insertion is not
            let existingDOMnode = this.$("*[data-id='" + itemWidget.id + "']");
            if (existingDOMnode.size()) {
                existingDOMnode.remove();
            }
            let index = this.__parentedChildren.findIndex(e => e.id == itemWidget.id);
            // if first prepend to parent widget
            if (index == 0) {
                itemWidget.prependTo(this.$el);
            }
            // if last append to parent widget
            else if (index == (this.__parentedChildren.length - 1)) {
                itemWidget.appendTo(this.$el)
            }
            // if somewhere in middle insert after prior widget
            else {
                let priorWidget = this.__parentedChildren[index - 1];
                // Make sure that both prior widget and list widget is rendered before inserting after prior widget,
                // It wouldn't work without this if priorWidget's willStart() take some time to resolve.
                $.when(priorWidget._is_rendered, this._is_rendered).then(() => {
                    itemWidget.insertAfter(priorWidget.$el);
                });

            }
        },
        _onChangeParent(evt) {
            evt.stopped = true;
            this.list.set(evt.data.id, evt.data.item);
            this._sortWidgets();
        },
        _onChangeOrder(evt) {
            evt.stopped = true;
            if (evt.data.itemWidget.$el) {
                evt.data.itemWidget.$el.remove();
            }
            this._appendInOrder(evt.data.itemWidget, evt.data.order);
        },
        _onRemoveItem(evt) {
            this.removeItem(evt.data.id);
            // Since item is getting destroyed, and it is better to set evt.target to this list
            evt.target = this;
        },
        _handleError(error) {
            let traceback = error ? error.stack : '';
            crash_manager.show_error({
                type: _t("Odoo Client Error"),
                message: error.message,
                data: {debug: _t('Traceback:') + "\n" + traceback},
            });
        }
    });

    // <<<<==========================++++++ LIST ITEMS +++++==============================>>>>

    const AbstractModelListItem = AgileBaseWidget.extend({
        _name: "AbstractModelListItem",
        // _class is used to determine type of object in some methods like addItem of ModelList
        _class: "ModelListItem",
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            this._require_prop("order_field", "Make sure that ModelListItem implementation sets order_field");
            this.removeConfirmation && this._require_obj("removeConfirmation", ['title', 'message']);
        },
        changeParent(parent) {
            this._super(parent);
            this.trigger_up("change_parent", {id: this.id, item: this});
        },
        /**
         * This method is used to set list item id asynchronously, e.g. after rendering list item prior to record creation
         * @param id
         */
        setId(id) {
            this.id = id;
            this.$el.attr("data-id", id);
            this.trigger_up("change_parent", {id: this.id, item: this});
        },
        // Use this in order to change ListItems order in ModelList widget
        set_order(order, write = false) {
            this.trigger_up("change_order", {itemWidget: this, order});
            if (write) {
                this.dataset.write(this.id, {[this.order_field]: order})
                    .done(r => console.info(`Agile order saved: ${this.id}, ${order}`))
                    .fail(r => console.error("Error while saving agile order: ", r));
            }
        },
        set_list(listWidget, order) {
            this.changeParent(listWidget);
            this.set_order(order);
        },

        remove() {
            if (this.removeConfirmation) {
                dialog.confirm(this.removeConfirmation.title, this.removeConfirmation.message, this.removeConfirmation.okText, this.removeConfirmation.cancelText).done(() => {
                    this._unlink();
                });
            }
            else {
                this._unlink();
            }
        },
        _unlink() {
            this.dataset.unlink([this.id]).then(() => {
                this.trigger_up("remove_item", {
                    id: this.id,
                    itemData: this.record
                });
            });
        }
    });

    return {
        ModelList,
        AbstractModelListItem,
    };
});
