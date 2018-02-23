# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models


class ProjectWorkflowPublisher(models.AbstractModel):
    _inherit = 'project.workflow.publisher'

    def update_board_no_switch(self, old, board, wkf_states, status_tree):
        super(ProjectWorkflowPublisher, self).update_board_no_switch(
            old, board, wkf_states, status_tree
        )

        if board.type != 'scrum':
            return

        states = []
        for state in board.scrum_backlog_state_ids:
            if state.workflow_id != old:
                states.append(state.id)
            else:
                wkf_state = wkf_states[state.stage_id.id]
                states.append(wkf_state.id)

        if states:
            board.write({
                'scrum_backlog_state_ids': [(6, 0, states)]
            })
