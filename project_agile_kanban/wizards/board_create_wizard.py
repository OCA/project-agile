# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class BoardCreateWizard(models.TransientModel):
    _inherit = 'project.agile.board.create.wizard'

    kanban_backlog_status_id = fields.Many2one(
        comodel_name='project.workflow.state',
        domain="[('workflow_id', '=', workflow_id)]",
        string='Backlog Status',
        agile=True,
    )

    def post_create_hook(self, board):
        if board.type == 'kanban':
            vals = {
                'default_kanban_status_id': self.map_default_kanban_status(board),
                'kanban_backlog_status_id': self.kanban_backlog_status_id.id
            }

            board.write(vals)

    def map_default_kanban_status(self, board):
        for column in board.column_ids:
            if column.name == 'To Do':
                for status in column.status_ids:
                    if status.name == 'ToDo':
                        return status.id
