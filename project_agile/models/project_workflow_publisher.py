# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models


class ProjectWorkflowPublisher(models.AbstractModel):
    _inherit = 'project.workflow.publisher'

    def _do_publish(self, old, new, project_id=None, switch=False):

        if not switch:

            # We need to map workflow states by their assigned task stage
            wkf_states = dict()
            for wkf_state in new.state_ids:
                wkf_states[wkf_state.stage_id.id] = wkf_state

            for board in self.env['project.agile.board'].sudo().search([('workflow_id', '=', old.id)]):
                status_tree = dict()
                for status in board.mapped("column_ids.status_ids"):
                    status_tree[status.stage_id.id] = status
                self.update_board_no_switch(board, wkf_states, status_tree)

        elif project_id:
            project_id.write({'board_ids': [(5,)]})

            if project_id.agile_enabled:
                default_board = self.env['project.agile.board'].search([
                    ('workflow_id', '=', new.id), ('type', '=', project_id.agile_method), ('is_default', '=', True)
                ])

                if default_board.exists():
                    project_id.write({'board_ids': [(4, default_board.id,)]})

        return super(ProjectWorkflowPublisher, self)._do_publish(old, new, project_id, switch)

    def update_board_no_switch(self, board, wkf_states):
        # Detect and delete states which does not exists anymore
        to_delete = []

        for status in board.status_ids:
            if status.stage_id.id not in wkf_states:
                to_delete.append(status.id)
            else:
                wkf_state = wkf_states[status.stage_id.id]
                status.write({'state_id': wkf_state.id})

        if to_delete:
            self.env['project.agile.board.column.status'].browse(to_delete).unlink()