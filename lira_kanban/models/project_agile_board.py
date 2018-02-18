# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class ProjectAgileBoard(models.Model):
    _inherit = 'project.agile.board'

    kanban_backlog_column_id = fields.Many2one(
        comodel_name="project.agile.board.column",
        lira=True,
    )
    kanban_backlog_column_status_id = fields.Many2one(
        comodel_name="project.agile.board.column.status",
        lira=True,
    )
    kanban_backlog_column_stage_id = fields.Many2one(
        comodel_name="project.task.type",
        lira=True,
    )
    kanban_backlog_status_id = fields.Many2one(
        comodel_name='project.workflow.state',
        lira=True,
    )
    kanban_backlog_stage_id = fields.Many2one(
        comodel_name="project.task.type",
        lira=True,
    )
    kanban_task_type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        lira=True,
    )
