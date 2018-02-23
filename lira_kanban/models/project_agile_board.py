# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class ProjectAgileBoard(models.Model):
    _inherit = 'project.agile.board'

    kanban_backlog_column_id = fields.Many2one(
        comodel_name="project.agile.board.column",
        lira=True,
    )

    kanban_backlog_column_status_ids = fields.One2many(
        comodel_name='project.agile.board.kanban.backlog.column.status',
        lira=True,
    )

    kanban_backlog_column_stage_ids = fields.One2many(
        comodel_name='project.task.type',
        compute="compute_kanban_backlog_column_stage_ids",
        lira=True,
    )

    kanban_backlog_state_ids = fields.One2many(
        comodel_name='project.agile.board.kanban.backlog.state',
        lira=True,
    )

    kanban_backlog_stage_ids = fields.One2many(
        comodel_name='project.task.type',
        compute="compute_kanban_backlog_stage_ids",
        lira=True,
    )

    @api.one
    @api.depends(
        "kanban_backlog_column_status_ids",
        "kanban_backlog_column_status_ids.stage_id"
    )
    def compute_kanban_backlog_column_stage_ids(self):
        self.kanban_backlog_column_stage_ids = \
            self.mapped("kanban_backlog_column_status_ids.stage_id")

    @api.one
    @api.depends(
        "kanban_backlog_state_ids",
        "kanban_backlog_state_ids.state_id",
        "kanban_backlog_state_ids.state_id.stage_id"
    )
    def compute_kanban_backlog_stage_ids(self):
        self.kanban_backlog_stage_ids = \
            self.mapped("kanban_backlog_state_ids.state_id.stage_id")


class AgileBoardColumnStatus(models.Model):
    _inherit = 'project.agile.board.kanban.backlog.column.status'

    status_id = fields.Many2one(
        lira=True,
    )

    stage_id = fields.Many2one(
        lira=True,
    )

    workflow_id = fields.Many2one(
        lira=True,
    )


class AgileBoardKanbanBacklogState(models.Model):
    _inherit = 'project.agile.board.kanban.backlog.state'

    state_id = fields.Many2one(
        lira=True,
    )

    stage_id = fields.Many2one(
        lira=True,
    )

    workflow_id = fields.Many2one(
        lira=True,
    )
