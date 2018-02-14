# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class Board(models.Model):
    _inherit = 'project.agile.board'

    type = fields.Selection(
        selection_add=[('scrum', 'Scrum')],
    )

    scrum_task_type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        relation="project_agile_scrum_board_task_type_rel",
        column1="board_id",
        column2="type_id",
        string="Active Sprint Task Types",
        agile=True,
        help='List of available task types for active sprint.'
             'If left empty task types from registered projects will be used',
    )
