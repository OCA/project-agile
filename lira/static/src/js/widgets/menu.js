// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.menu', function (require) {
    "use strict";

    var AgileBaseWidgets = require('lira.BaseWidgets');
    var AgileContainerWidget = AgileBaseWidgets.AgileContainerWidget;
    var hash_service = require('lira.hash_service');

    var core = require('web.core');
    var _t = core._t;
    window.qweb = core.qweb;

    var AgileMenu = AgileContainerWidget.extend({
        _name: "AgileMenu",
        init(parent, options = {}) {
            Object.assign(this, options);
            this._super(parent, options);
        },
        build_widget_list() {
            throw new Error("You must implement build_widget_list() method in your implementation of AgileMenu class.")
        },
        // Building widge
        build_widgets() {
            // We need to convert flat array to hierarchy of parent-child menuitems
            // Dictionary of menuitem id, and the menuitem object
            // is used to index all menuitems for easy linking and checking for existance
            let map = new Map();
            for (let def of this.widgetDefinitions) {
                if (map.has(def.args.id)) {
                    throw new Error("Duplicate id in menu widget: " + def.args.id);
                }
                map.set(def.args.id, def);
            }
            // Link every menuitem to it's parent if it has one, by adding it to parents children array
            for (let def of map.values()) {
                if (def.args !== undefined && def.args.parent) {
                    let parent = map.get(def.args.parent);
                    if (parent === undefined) {
                        throw new Error("Menu item definition: Parent id not found: " + def.args.parent);
                    }
                    // Append child to children array or create one if doesn't already exist
                    if (parent.args.children instanceof Array) {
                        parent.args.children.push(def)
                    } else {
                        parent.args.children = [def]
                    }
                }
            }
            // Create widgets array from map that only contains root menuitems (without parent),
            // and sort them by sequence
            let widgets = [...map.values()]
                .filter((def) => def.args.parent === undefined || def.args.parent === null)
                .sort((a, b) => a.args.sequence - b.args.sequence);

            for (let def of widgets) {
                def.args.viewKey = !(def.args.viewKey) ? this.viewKey : def.args.viewKey;
                this.render_widget(def)
            }
        },
    });
    var AgileViewMenu = AgileMenu.extend({
        _name: "AgileViewMenu",
        init(parent, options) {
            this._super(parent, options);
            this._require_prop("boardType");
        },
        build_widget_list() {
            this.add_widget({
                name: 'dashboard',
                widget: AgileVerticalFromTopMenuItem,
                append: "ul#nav-mobile",
                'args': {
                    id: "dashboard",
                    view: "dashboard",
                    icon: "view-dashboard",
                    name: _t("Dashboard"),
                    viewKey: "page",
                    sequence: 0.5,
                }
            });
        },
        start() {
            this.$('.collapsible').collapsible();
            // Perfect Scrollbar
            this.$('select').not('.disabled').material_select();
            return this._super();
        }
    });
    var AgileTopMenu = AgileMenu.extend({
        _name: "AgileTopMenu",
        tagName: "ul",
        build_widget_list() {
            this.add_widget({
                'name': 'dashboard',
                'widget': AgileHorizontalMenuItem,
                'args': {
                    id: "dashboard",
                    view: "dashboard",
                    name: _t("Dashboard"),
                    sequence: 1,
                }
            });
        }
    });
    var AgileMenuItem = AgileContainerWidget.extend({
        _name: "AgileMenuItem",
        template: "lira.menu.menuitem",
        init(parent, options) {
            this._super(parent, options);
            Object.assign(this, options);
        },
        build_widgets() {
            if (this.children instanceof Array && this.children) {
                for (let def of this.children.sort((a, b) => a.args.sequence - b.args.sequence)) {
                    def.args.viewKey = !(def.args.viewKey) ? this.viewKey : def.args.viewKey;
                    this.render_widget(def);
                }
            }
        }
    });
    var AgileHorizontalMenuItem = AgileMenuItem.extend({
        _name: "AgileHorizontalMenuItem",
        template: "lira.menu.menuitem.horisontal",
        start() {
            this.$el.find("a").click(() => hash_service.setHash(this.viewKey, this.view));
            return this._super();
        }
    });
    var AgileVerticalMenuItem = AgileMenuItem.extend({
        _name: "AgileVerticalMenuItem",
        init(parent, options) {
            if (options.children && options.children.length > 0) {
                this.template = "lira.menu.category";
            }
            if (options.parent) {
                this.template = "lira.menu.subitem"
            }
            this._super(parent, options);
        },
        start() {
            if (!this.children || this.children.length == 0) {
                this.$("a").click(() => {
                    hash_service.setHash(this.viewKey, this.view);
                    $('.button-collapse').sideNav('hide');
                });
            }
            return this._super();
        }
    });
    var AgileVerticalFromTopMenuItem = AgileMenuItem.extend({
        _name: "AgileVerticalFromTopMenuItem",
        template: "lira.menu.menuitem.overflow",
        init(parent, options) {
            if (options.children && options.children.length > 0) {
                this.template = "lira.menu.category";
            }
            if (options.parent) {
                this.template = "lira.menu.subitem"
            }
            this._super(parent, options);
        },
        start() {
            if (!this.children || this.children.length == 0) {
                this.$("a").click(() => hash_service.setHash(this.viewKey, this.view));
            }
            return this._super();
        }
    });
    return {
        AgileMenu,
        AgileViewMenu,
        AgileTopMenu,
        AgileMenuItem,
        AgileHorizontalMenuItem,
        AgileVerticalMenuItem,
        AgileVerticalFromTopMenuItem

    }
});
