"use strict";
// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).


odoo.define('project_agile.mixins', function (require) {

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

    return {
        RequireMixin
    }

});
