// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.hash_service', function (require) {
    "use strict";

    var core = require('web.core');
    var mixins = require('web.mixins');

    var HashService = core.Class.extend(mixins.EventDispatcherMixin, {
        init(){
            mixins.EventDispatcherMixin.init.call(this);
            $(window).hashchange((e) => {
                e.preventDefault();
                this.set_from_hash(this.extract_hash(e.originalEvent.oldURL), location.hash)
            });
            this.__properties = {};
            this.set_from_hash(null, location.hash);
        },
        /*
        * set,get and delete are simulation of Properties mixnin,
        * but set/delete trigger change event only if value changes,
        * and returns object with oldValue & newValue
        */
        set(key, value, quiet = false){
            if (this.__properties[key] !== value) {
                let tmp = this.__properties[key];
                this.__properties[key] = value;
                if (tmp !== value && !quiet) {
                    this.trigger("change:" + key, this, {
                        oldValue: tmp,
                        newValue: value
                    });
                }
            }
        },
        delete(key){
            if (key in this.__properties) {
                let tmp = this.__properties[key];
                delete this.__properties[key];
                if (tmp !== undefined) {
                    this.trigger("change:" + key, this, {
                        oldValue: tmp,
                        newValue: undefined
                    });
                }
                this.hashToUrl(this.__properties, false);
            }
        },
        get(key) {
            return this.__properties[key];
        },

        /*
        * setHash method sets internal properties and updates url
        * if storeToHistory is false, this action will not be appended to history stack
        */
        setHash(key, value = true, storeToHistory = true, quiet = false){
            this.set(key, value, quiet);
            this.hashToUrl(this.__properties, storeToHistory);
        },
        extract_hash(url){
            return url.slice(url.indexOf("#"));
        },
        set_from_hash(oldHash, newHash){
            oldHash = oldHash || "";
            var oldHashObject = this.__properties;
            var newHashObject = this.parseHash(newHash);
            for (let key in oldHashObject) {
                if (!(key in newHashObject)) {
                    this.delete(key);
                }
            }
            for (let key in newHashObject) {
                if(oldHashObject[key]!=newHashObject[key]) {
                    this.set(key, newHashObject[key]);
                }
            }
        },
        parseHash(hashString){
            var hash = {};
            if (hashString) {
                let hashParts = hashString.substring(1).split("&");
                for (let part of hashParts) {
                    if (part.includes("=")) {
                        let [key, value] = part.split("=");
                        hash[key] = value;
                    } else {
                        hash[part] = true;
                    }
                }
            }
            return hash;
        },
        hashToUrl(hashObject, storeToHistory = true){
            if (storeToHistory) {
                location.hash = "#" + $.param(hashObject);
            } else {
                history.replaceState(undefined, undefined, "#" + $.param(hashObject))
            }
        }
    });
    window.hash_service = new HashService();
    return window.hash_service;
});