// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.TaskWorkflow', function (require) {
    "use strict";

    var TaskWorkflow = require('project_workflow.TaskWorkflow');

    TaskWorkflow.include({

        prepare_values_for_update: function (state) {
            var values = this._super(state);
            values.resolution_id = state.resolution_id;
            return values;
        },

        build_confirmation_context: function(state){
            var context = this._super(state);
            context.default_resolution_id = state.resolution_id;
            return context;
        },

    });
});
