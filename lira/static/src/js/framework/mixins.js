"use strict";
// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).


odoo.define('lira.mixins', function (require) {

    /**
     * This mixin adds methods to class that checks and throws error if class is not properly instantiated.
     */
    let RequireMixin = {
        /**
         *
         * @param {string} property - Name of required property of object
         * @param {string} [message] - Custom error message
         * @private
         */
        _require_prop(property, message = "") {
            if (this[property] === undefined || this[property] === null) {
                throw new Error(`Property ${property} must be specified! ${message}`);
            }
        },
        /**
         *
         * @param {string} method - Name of required method of object
         * @param {string} [message] - Custom error message
         * @private
         */
        _require_method(method, message = "") {
            if (typeof this[method] !== "function") {
                throw new Error(`Method ${method} must be defined! ${message}`);
            }
        },
        /**
         *
         * @param {string} object - Name of required sub-object
         * @param {string[]} properties - Properties that sub-object has to have
         * @param {string} [message] - Custom error message
         * @private
         */
        _require_obj(object, properties = [], message = "") {
            if (typeof this[object] !== "object") {
                throw new Error(`Object ${object} must be specified! ${message}`);
            }
            properties.forEach(this._require_prop.bind(this[object]));
        },
    };

    let MenuItemsMixin = {
        menuItems: [],
        menuItemsContainer: false,
        init() {
            this.menuItems = this.menuItems.sort((x, y) => x.sequence > y.sequence);
        },
        start() {
            for (let item of this.menuItems) {
                let callback = typeof item.callback == "function" ? item.callback : this[item.callback];
                if (typeof callback !== "function") {
                    throw new Error("menuItem.callback must be function or name of method");
                }
                this.$(`.${item.class}`).unbind("click");
                this.$(`.${item.class}`).click(callback.bind(this));
            }
            this.updateMenuVisibility();
        },
        updateMenuVisibility() {
            this.menuItemsContainer && this.$(this.menuItemsContainer).hide();
            for (let item of this.menuItems) {
                // First check if hidden is function, and call it,
                // then check if function exists on widget,
                // at last just use hidden as value.
                let hidden = typeof item.hidden == "function" ? item.hidden.call(this) :
                    typeof this[item.hidden] == "function" ? this[item.hidden].call(this) :
                        item.hidden;
                $.when(hidden).then(hidden => {
                    if (hidden) {
                        this.$(`.${item.class}`).hide();
                    } else {
                        this.$(`.${item.class}`).show();
                        this.menuItemsContainer && this.$(this.menuItemsContainer).show();
                    }
                })

            }
        }
    };

    return {
        RequireMixin,
        MenuItemsMixin
    }

});
