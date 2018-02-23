# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class Board(models.Model):
    _inherit = 'project.agile.board'

    scrum_backlog_state_ids = fields.Many2many(
        comodel_name='project.workflow.state',
        lira=True,
    )
