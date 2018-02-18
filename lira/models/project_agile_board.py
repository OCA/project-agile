# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class Board(models.Model):
    _inherit = 'project.agile.board'

    name = fields.Char(lira=True)
    description = fields.Char(lira=True)
    type = fields.Selection(lira=True)
    project_ids = fields.Many2many(
        comodel_name="project.project",
        lira=True,
    )
    column_ids = fields.One2many(
        comodel_name="project.agile.board.column",
        lira=True,
    )
    unmapped_state_ids = fields.One2many(
        comodel_name='project.workflow.state',
        lira=True,
    )
    unmapped_task_stage_ids = fields.One2many(
        comodel_name='project.task.type',
        lira=True,
    )
    task_type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        lira=True,
    )
