// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.view_manager', function (require) {
    "use strict";

    const hash_service = require('lira.hash_service');
    const SubheaderWidget = require('lira.subheader').SubheaderWidget;
    const AgileBaseWidget = require('lira.BaseWidgets').AgileBaseWidget;
    const TaskView = require('lira.view.task').TaskView;
    const web_core = require('web.core');
    const _t = web_core._t;


    // Key is used to define what string should be used in hash_service for ViewManager
    const ViewManager = AgileBaseWidget.extend({
        key: "view",
        template: "lira.view_manager",
        custom_events: {
            set_title: '_onSetTitle',
            init_action_menu: function (evt) {
                this.initActionMenu(evt.data.items);
            },
            rerender_view: function (evt) {
                this.rerender_view();
            }
        },
        init(parent, options = {}) {
            this._super(parent, options);
            Object.assign(this, options);
            this._require_prop("key");
            this._require_prop("defaultView");

            this.build_view_registry();
            this.instantiate_views();
            this.register_events();
        },

        instantiate_views() {
            //Subscribe to view change event on hash service
            hash_service.on("change:" + this.key, this, (hash_service, options) => options.newValue && this.set_view(options.newValue));
            // Setting view will render it again, so when board is changed, load same view for that board.
            hash_service.on("change:board", this, (hash_service, options) => options.newValue && this.set_view(hash_service.get("view")));
        },
        register_events() {
            this.on("loading:start", this, () => {
                this.$(".progress").addClass("active");
                this.$(".view-content").removeClass("loaded");
            });
            this.on("loading:stop", this, () => {
                this.$(".progress").removeClass("active");
                this.$(".view-content").addClass("loaded");
            });
        },
        renderElement() {
            this._super();
            // set default view if none is set
            if (!hash_service.get(this.key)) {
                hash_service.setHash(this.key, this.defaultView, false);
            } else {
                this.set_view(hash_service.get(this.key));
            }
            this.subheader = new SubheaderWidget(this);
            this.subheader.appendTo(this.$("#subheader-wrapper"));
        },
        set_view(view_name) {
            if (this.view_registry.get(view_name)) {
                this.current_view = view_name;
                let ViewWidget = this.view_registry.get(view_name);

                // Checking if ViewWidget is AgileBaseWidget subclass,
                // I've been able to identify that it is subclass of root OdooClass
                // TODO: Test if ViewWidget is extension of AgileBaseWidget
                if (!ViewWidget.toString().includes("OdooClass")) {
                    throw new Error("Widget does not exist");
                }

                // if current widget property is set, and has destroy method, call it to destroy widget.
                if (this.widget && typeof this.widget.destroy === "function") {
                    var old = this.widget;
                    this.removeActionMenu();
                    // TODO: Remove this hack
                    if (typeof this.widget.removeNavSearch === "function") {
                        this.widget.removeNavSearch();
                    }
                }

                this.trigger("loading:start");
                // Instantiate ViewWidget with this as parent and add it to DOM.
                this.widget = new ViewWidget(this);
                this.widget.appendTo(this.$("widget.view-content").empty());
                this.widget._is_added_to_DOM.then(() => {
                    if (old) {
                        old.destroy();
                    }
                    this.trigger("loading:stop");
                });


                console.log(this.message = "View " + view_name + " loaded...");
            } else {
                hash_service.setHash(this.key, this.defaultView, false);
                console.error(_t("View ") + view_name + _t(" does not exist!"));
            }
        },
        rerender_view() {
            this.set_view(this.current_view);
        },
        // Overwrite this method and call this._super() in order to add additional views to registry
        // view_registry is map with view name as key and widget class as value
        // All view widgets should extend AgileViewWidget, and set appropriate title property
        build_view_registry() {
            this.view_registry = new Map();
            this.view_registry.set("task", TaskView);
        },
        /**
         *
         * @callback actionCallback
         *
         * @param {Object[]} menuItems Array of menu items
         * @param {string} menuItems[].icon - Class of Material Design Icon (without dot)
         * @param {string} menuItems[].title - Text to be displayed in button
         * @param {actionCallback} menuItems[].action - Callback to run when button is clicked.
         */
        initActionMenu(menuItems) {
            if (jQuery.isFunction(menuItems)) {
                let callback = menuItems;
                var el = $("<div/>");
                el.appendTo(this.$(".actions-menu"));

                let actionMenuPromise = callback(el);
                if (jQuery.isFunction(actionMenuPromise.promise)) {
                    actionMenuPromise.always((widget) => {
                        if (widget == this.widget) {
                            this.$(".actions-menu").empty();
                        }
                    })
                } else {
                    throw new Error("openRightSide callback should return promise");
                }
                return;
            }
            if (!Array.isArray(menuItems)) {
                throw new Error("menuItems must be an array");
            }
            for (let item of menuItems) {
                if (item.widget && item.widget.__AGILE_BASE_WIDGET) {
                    item.widget.appendTo(this.$(".actions-menu"));
                } else {
                    let node = $('<a class="btn-floating btn-large btn-flat waves-effect"></a>');
                    let html = "";
                    if (item.icon) {
                        html += "<i class='mdi mdi-" + item.icon + " large'></i>";
                    } else {
                        html += item.title;
                    }
                    node[0].innerHTML = html;
                    node.click(item.action);
                    node.appendTo(this.$(".actions-menu"));
                }
            }
        },
        removeActionMenu() {
            this.$(".actions-menu").empty();
        },
        _onSetTitle(evt) {
            this._is_rendered.then(()=>{
               this.subheader.setTitle(evt.data.title);
            });
        }
    });
    return ViewManager;
});
