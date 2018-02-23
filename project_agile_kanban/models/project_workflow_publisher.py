# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models


class ProjectWorkflowPublisher(models.AbstractModel):
    _inherit = 'project.workflow.publisher'

    def update_board_no_switch(self, old, board, wkf_states, status_tree):
        super(ProjectWorkflowPublisher, self).update_board_no_switch(
            old, board, wkf_states, status_tree
        )

        if board.type != 'kanban':
            return

        backlog_column_status = board.kanban_backlog_column_status_ids.filtered(
            lambda s: s.workflow_id == old
        )

        if len(backlog_column_status):
            status = status_tree.get(
                backlog_column_status.stage_id.id, False
            )

            if status:
                backlog_column_status.status_id = status.id

        backlog_state = board.kanban_backlog_state_ids.filtered(
            lambda s: s.workflow_id == old
        )

        if len(backlog_state):
            state = wkf_states.get(backlog_state.state_id.stage_id.id, False)
            if state:
                backlog_state.state_id = state.id
