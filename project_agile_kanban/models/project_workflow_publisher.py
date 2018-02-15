# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models


class ProjectWorkflowPublisher(models.AbstractModel):
    _inherit = 'project.workflow.publisher'

    def update_board_no_switch(self, board, wkf_states, status_tree):
        super(ProjectWorkflowPublisher, self).update_board_no_switch(
            board, wkf_states
        )

        vals = {}
        if board.kanban_backlog_stage_id:
            state = wkf_states.get(board.kanban_backlog_stage_id.id, False)
            if state:
                vals['kanban_backlog_status_id'] = state.id

        if board.kanban_backlog_column_status_id:
            status = status_tree.get(
                board.kanban_backlog_column_stage_id.id, False
            )
            if status:
                vals['kanban_backlog_column_status_id'] = status.id
        if vals:
            board.write(vals)
