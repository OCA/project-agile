// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.storage_service', function (require) {
    "use strict";

    var core = require('web.core');
    var mixins = require('web.mixins');

    var StorageService = core.Class.extend(mixins.EventDispatcherMixin, {
        init(prefix) {
            mixins.EventDispatcherMixin.init.call(this);
            this.prefix = prefix + "_";
        },
        /*
         * set,get and delete are simulation of Properties mixin,
         * but set/delete trigger change event only if value changes,
         * and returns object with oldValue & newValue
         */
        set(key, value) {
            let keyWithPrefix = this.prefix + key;
            let currentVal = window.localStorage.getItem(keyWithPrefix);
            if (typeof value === "object") {
                value = JSON.stringify(value);
            }
            if (currentVal !== value) {
                let tmp = currentVal;
                window.localStorage.setItem(keyWithPrefix, value);
                if (tmp !== value) {
                    this.trigger("change:" + key, this, {
                        oldValue: tmp,
                        newValue: value
                    });
                }
            }
        },
        delete(key) {
            let keyWithPrefix = this.prefix + key;
            let currentVal = window.localStorage.getItem(keyWithPrefix);
            if (currentVal !== null) {
                let tmp = this.currentVal;
                window.localStorage.removeItem(keyWithPrefix);
                if (tmp !== undefined && tmp !== null) {
                    this.trigger("change:" + key, this, {
                        oldValue: tmp,
                        newValue: undefined
                    });
                }
            }
        },
        get(key) {
            let keyWithPrefix = this.prefix + key;
            let currentVal = window.localStorage.getItem(keyWithPrefix);
            return this._isJsonString(currentVal) ? JSON.parse(currentVal) : currentVal;
        },
        /**
         * This method returns a Proxy that will expose object from storage_service
         * that can be written to. Writing to live object will call set method on storage_service
         * Live object is also subscribed to changes, so it will update itself if other tabs update value.
         * Getting live object will create empty object in localStorage if it already doesn't exist
         * @param key
         */
        getLive(key) {
            let target = this.get(key);
            if (typeof target !== "object") {
                throw new Error("getLive used on property that is not an object");
            } else if (!target) {
                this.set(key, target = {});
            }
            //TODO: In order for this to work, we need to return Proxy with recursion (returning proxy on get trap if type of property is object)
            return new Error("Not implemented");
        },
        _isJsonString(str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        }

    });

    return new StorageService("project_agile");
});
