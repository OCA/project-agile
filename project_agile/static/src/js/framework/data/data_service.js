"use strict";
// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.DataService', function (require) {

    var core = require('project_agile.core');
    var data = require('project_agile.data');
    var web_core = require('web.core');
    var AgileMixins = require('project_agile.mixins');

    // TODO: Here we should implement some GC algorithm and maybe cache sharing between tabs.
    // Problem id: 60a91bed-b6ed-48cc-80db-69152e31cd12
    let DataService = web_core.Class.extend(AgileMixins.RequireMixin, {
        __dataService: true,
        readonly: true,
        init(options) {
            Object.assign(this, options);
            this._require_prop("model");
            // Fields list is being fetched from model_info, which means that all fields defined with with agile=True are being fetched
            this.modelMetaLoaded = data.cache.get("model_info", {model: this.model}).then(model => {
                this.modelMeta = model;
                this.onModelMetaLoaded();
            });
            this.dataset = data.getDataSet(this.model);
            // Records are being cached in Map <id,record>
            this.records = new Map();
        },
        onModelMetaLoaded() {
            this.modelMeta.sync && this.subscribeToChanges();
        },
        _filterRecords(ids, toMap) {
            if (ids === undefined) {
                return toMap ? new Map(this.records) : [...this.records.values()];
            }
            if (toMap) {
                let result = new Map();
                ids.forEach(id => result.set(id, this.records.get(id)));
                return result;
            }
            let result = [];
            ids.forEach(id => result.push(this.records.get(id)));
            return result;
        },
        getRecords(ids, toMap) {
            let misses = ids.filter(id => !this.records.has(id));
            if (misses.length) {
                return this.modelMetaLoaded.then(() => {
                    return this.dataset.read_ids(misses, this.modelMeta.fields_list).then(records => {
                        records.forEach(record => {
                            this.records.set(record.id, this.wrapRecord(record));
                        });
                        return this._filterRecords(ids, toMap);
                    })
                })
            } else {
                let result = [];
                ids.forEach(id => result.push(this.records.get(id)));
                return $.when(this._filterRecords(ids, toMap));
            }
        },
        getAllRecords(toMap = false, fetchAgain = false) {
            // Prevent calling read_slice everytime, only if fetchAgain is true, we will get IDs that are not cached from the server.
            if (!this.allRecordsPromise || fetchAgain) {
                this.allRecordsPromise = this.modelMetaLoaded.then(() => {
                    let cachedIds = [...this.records.keys()];
                    return this.dataset.read_slice(this.modelMeta.fields_list, {
                        domain: [['id', 'not in', cachedIds]]
                    }).then(records => {
                        records.forEach(record => {
                            this.records.set(record.id, this.wrapRecord(record));
                        });
                        return this._filterRecords(undefined, toMap);
                    })
                })
            }
            return this.allRecordsPromise;
        },
        getRecord(id) {
            var def = $.Deferred();
            if (this.records.has(id)) {
                def.resolve(this.records.get(id));
            }
            else {
                this.getRecords([id]).then(res => {
                    def.resolve(res[0]);
                });
            }
            return def.promise();
        },
        wrapRecord(record) {
            let fields = this.modelMeta.fields;
            let readonly = this.readonly;
            let service = this;
            let editPromise = false;
            record._source = record;
            record._previous = undefined;

            record.copy = function () {
                let previous = Object.assign({}, this._source);
                delete previous._previous;
                delete previous._source;
                return previous;
            };

            record.update = function (values) {
                this._previous = this.copy();
                this._source = Object.assign(this._source, values);
            };

            return new Proxy(record, {
                set(trapTarget, key, value, receiver) {
                    if (key === "id") {
                        throw new TypeError("You are not allowed to change records id", arguments);
                    }
                    if (readonly) {
                        throw new TypeError("DataService is declared as readonly, you can not write to it's records", arguments);
                    }
                    let field = fields[key] || {};
                    // If field is persistable, send write request to server.
                    if (Object.keys(fields).includes(key)) {
                        // Since many2one fields return [id,name] array, make sure not to compare arrays
                        let writeValue = field.type === "many2one" && Array.isArray(value) ? value[0] : value;
                        let receiverValue = field.type === "many2one" ? receiver[key][0] : receiver[key];
                        if (writeValue === receiverValue) {
                            return Reflect.set(trapTarget, value, receiver);
                        }
                        !field.readonly && service.dataset.write(trapTarget.id, {[key]: writeValue})
                            .done(r => console.info(`Saved ${service.dataset.model} [${trapTarget.id}]: ${key} - ${value}`))
                            .fail(r => console.error(`Error ${service.dataset.model} [${trapTarget.id}]: ${key} - ${value}`, r));
                        // Do not change value because _previous will contain wrong value afterwards
                        return Reflect.set(trapTarget, key, trapTarget[key], receiver);
                    }
                    return Reflect.set(trapTarget, key, value, receiver);
                },
                get(trapTarget, key, receiver) {
                    let record = trapTarget;
                    // Sign that it is data_service
                    if (key === "_is_dataservice") {
                        return true;
                    }
                    if (key === "_edit") {
                        return function (promise) {
                            if (promise === "check") {
                                return editPromise && editPromise.state() === "pending";
                            } else if (promise !== undefined) {
                                editPromise = promise;
                            }
                            return editPromise;
                        }
                    }
                    // if target doesn't contain key, assume it is function.
                    if (!(key in receiver)) {
                        // Wrap function in a Proxy that will catch arguments
                        return new Proxy(() => {
                        }, {
                            apply: function (trapTarget, thisArg, argumentList) {
                                let context = service.dataset.get_context().eval();
                                if (argumentList.length > 0) {
                                    let argument = argumentList[argumentList.length - 1];
                                    if (argument.context) {
                                        context = Object.assign(argument.context, context);
                                        argumentList.length--;
                                    }
                                }

                                return service.dataset._model.call(key, [[record.id], ...argumentList], {context: context})
                            }
                        });
                    }

                    return Reflect.get(trapTarget, key, receiver);
                }
            });
        },
        subscribeToChanges() {
            data.sync.subscribe(odoo.session_info.db + ":" + this.model, notification => {
                let id = notification[0][2];
                let payload = notification[1];
                switch (notification[1].method) {
                    case "write":
                        this.recordUpdated(id, payload.data, payload);
                        break;
                    case "create":
                        this.recordCreated(id, payload.data, payload);
                        break;
                    case "unlink":
                        let task = this.records.get(id);
                        if (task) {
                            this.records.delete(id);
                            payload.data = task;
                            this.recordDeleted(id, payload);
                        }
                        break;
                }
            })
        },
        recordUpdated(id, vals, payload) {
            let record = this.records.get(id);

            if (record)
                record.update(vals);

            core.bus.trigger(this.model + ":write", id, vals, payload, record);
        },
        recordCreated(id, vals, payload) {
            core.bus.trigger(this.model + ":create", id, vals, payload);
        },
        recordDeleted(id, payload) {
            core.bus.trigger(this.model + ":unlink", id, payload);
        },
        /**
         * Call this method to dinamically add new fields in runtime.
         * @param {string[]} fields - Name of fields to be dinamically added to DataService.
         * @deprecated
         */
        addFields(fields) {
            if (this.records.size) {
                let newFields = fields.filter(field => !this.fields.includes(field));
                this.fields.push.apply(this.fields, newFields);
                this.dataset.read_slice(newFields, {domain: [["id", "in", [...this.records.keys()]]]}).then(updates => {
                    updates.forEach(update => {
                        let record = this.records.get(update.id);
                        Object.assign(record._source, update);
                    })
                })
            }
        },
        setReadonly(readonly) {
            if (readonly !== undefined) {
                this.readonly = readonly;
            }
            return this;
        }
    });
    return DataService
});
