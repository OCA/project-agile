// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define(function (require) {
    "use strict";

    require('lira.view.task').WorkflowTransitionsWidget.include({

        getAllowedTransitions() {
            let transitions = this._super();
            let user_groups = this.current_user.groups_id;
            return _.filter(transitions,
                t => !(_.size(t.group_ids) > 0 && _.size(_.intersection(user_groups, t.group_ids)) == 0));
        },

    });
});
