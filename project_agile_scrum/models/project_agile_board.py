# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class Board(models.Model):
    _inherit = 'project.agile.board'

    type = fields.Selection(
        selection_add=[('scrum', 'Scrum')],
    )

    scrum_backlog_state_ids = fields.Many2many(
        comodel_name='project.workflow.state',
        relation="project_agile_scrum_board_backlog_state_rel",
        column1='board_id',
        column2='state_id',
        string='Backlog states'
    )
