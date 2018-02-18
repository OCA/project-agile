// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define(function (require) {
    "use strict";

    require('lira.view.kanban_table').AbstractKanbanTable.include({

        getAvailableTransitions(currentState, workflow, task) {
            let transitions = this._super(currentState, workflow, task);
            // If transition doesn't have task_type_ids, let it pass,
            // otherwise let only transitions whose task_type_ids includes this task.type_id[0]
            return transitions.filter(t => !t.task_type_ids.length || t.task_type_ids.length && t.task_type_ids.includes(task.type_id[0]));
        },
    });
});
