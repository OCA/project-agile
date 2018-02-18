// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.dependency_cache', function (require) {
    "use strict";

    const core = require('web.core');
    const AgileMixins = require('lira.mixins');
    const DataSet = require('lira.dataset');

    const DependencyCache = core.Class.extend({

        init() {
            this.deps = {};
        },

        orderedStringify(obj) {
            let copy = {};
            if (typeof obj !== "object") {
                return "";
            }
            Object.keys(obj).sort((a, b) => a > b).forEach(key => copy[key] = obj[key]);
            return JSON.stringify(copy);
        },
        // TODO: Here we should implement some GC algorithm and maybe cache sharing between tabs.
        // Problem id: 60a91bed-b6ed-48cc-80db-69152e31cd12
        invokeOnceFactory(Dependency, options) {
            let invoked = new Map();
            return params => {
                let optionsStringified = this.orderedStringify(params);
                if (!invoked.get(optionsStringified)) {
                    let dep = new Dependency(this, options, params);
                    invoked.set(optionsStringified, dep);
                    dep.resolve();
                }
                return invoked.get(optionsStringified).promise();
            }
        },

        add(name, dependency, options) {
            this.deps[name] = this.invokeOnceFactory(dependency, options);
        },

        get(name, params) {
            return this.deps[name](params);
        },

        has(name) {
            return this.deps[name] !== undefined;
        }

    });
    const AbstractDependency = core.Class.extend(AgileMixins.RequireMixin, {
        init(cache, options, params) {
            Object.assign(this, options);
            this.cache = cache;
            this.params = params;
            this.deferred = $.Deferred();
            this.getDataSet = DataSet.get;
        },
        /**
         * This method must be overridden and it should resolve/reject deferred with appropriate data.
         */
        resolve() {
            throw new NotImplementedException();
        },
        promise() {
            return this.deferred.promise();
        }
    });

    return {
        DependencyCache,
        AbstractDependency,
    }
});
