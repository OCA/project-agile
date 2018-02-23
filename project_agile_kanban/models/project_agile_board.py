# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class ProjectAgileBoard(models.Model):
    _inherit = 'project.agile.board'

    type = fields.Selection(
        selection_add=[('kanban', 'Kanban')],
    )

    kanban_backlog_column_id = fields.Many2one(
        comodel_name="project.agile.board.column",
        string="Backlog Column",
        help="This column will be used for moving items from backlog"
             " to the kanban board.",
    )

    kanban_backlog_column_status_ids = fields.One2many(
        comodel_name='project.agile.board.kanban.backlog.column.status',
        inverse_name='board_id',
        string='Backlog columns'
    )

    kanban_backlog_state_ids = fields.One2many(
        comodel_name='project.agile.board.kanban.backlog.state',
        inverse_name='board_id',
        string='Backlog states'
    )


class BacklogColumnStatus(models.Model):
    _name = 'project.agile.board.kanban.backlog.column.status'

    board_id = fields.Many2one(
        comodel_name='project.agile.board',
        string='Board',
        required=True,
        index=True,
        ondelete='cascade'
    )

    workflow_ids = fields.Many2many(
        comodel_name='project.workflow',
        compute="_compute_workflow_ids",
    )

    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        required=True,
        string='Workflow',
    )

    column_id = fields.Many2one(
        comodel_name="project.agile.board.column",
        related="board_id.kanban_backlog_column_id"
    )

    status_id = fields.Many2one(
        comodel_name="project.agile.board.column.status",
        required=True,
        string="Backlog Column Status",
        help="Every task moved to the column will be put in this status",
    )

    stage_id = fields.Many2one(
        comodel_name="project.task.type",
        string="Backlog Column Stage",
        related="status_id.stage_id",
        help="Every task moved to the column will be put in this stage",
    )

    _sql_constraints = [
        ("unique_board_workflow", "unique(board_id,workflow_id)",
         "Workflow must be unique per kanban board")
    ]

    @api.one
    @api.depends("board_id", "board_id.project_ids")
    def _compute_workflow_ids(self):
        self.workflow_ids = self.mapped("board_id.project_ids.workflow_id").ids


class BacklogStates(models.Model):
    _name = 'project.agile.board.kanban.backlog.state'

    board_id = fields.Many2one(
        comodel_name='project.agile.board',
        string='Board',
        required=True,
        index=True,
        ondelete='cascade'
    )

    workflow_ids = fields.Many2many(
        comodel_name='project.workflow',
        compute="_compute_workflow_ids",
    )

    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        required=True,
        string='Workflow',
    )

    state_id = fields.Many2one(
        comodel_name="project.workflow.state",
        required=True,
        string="Backlog State",
    )

    stage_id = fields.Many2one(
        comodel_name="project.task.type",
        string="Backlog Column Stage",
        related="state_id.stage_id",
    )

    _sql_constraints = [
        ("unique_board_workflow", "unique(board_id,workflow_id)",
         "One workflow state per board is allowed!")
    ]

    @api.one
    @api.depends("board_id", "board_id.project_ids")
    def _compute_workflow_ids(self):
        self.workflow_ids = self.mapped("board_id.project_ids.workflow_id").ids


class ProjectAgileBoardColumn(models.Model):
    _inherit = 'project.agile.board.column'

    def _min_max_available_for_types(self):
        types = super(ProjectAgileBoardColumn, self)\
            ._min_max_available_for_types()
        types.append('kanban')
        return types
