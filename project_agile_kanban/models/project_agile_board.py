# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


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
        agile=True,
    )

    kanban_backlog_column_status_id = fields.Many2one(
        comodel_name="project.agile.board.column.status",
        string="Backlog Column Status",
        help="Every task moved to the column will be put in this status",
        agile=True,
    )

    kanban_backlog_column_stage_id = fields.Many2one(
        comodel_name="project.task.type",
        string="Backlog Column Stage",
        related="kanban_backlog_column_status_id.stage_id",
        help="Every task moved to the column will be put in this status",
        agile=True,
    )

    kanban_backlog_status_id = fields.Many2one(
        comodel_name='project.workflow.state',
        domain="[('workflow_id', '=', workflow_id)]",
        string='Backlog Status',
        agile=True,
    )

    kanban_backlog_stage_id = fields.Many2one(
        comodel_name="project.task.type",
        string="Kanban backlog stage",
        related="kanban_backlog_status_id.stage_id",
        agile=True,
    )

    kanban_task_type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        relation="project_agile_kanban_board_task_type_rel",
        column1="board_id",
        column2="type_id",
        string="Kanban Task Types",
        agile=True,
        help='List of available task types for kanban table.'
             'If left empty task types from registered projects will be used',
    )


class ProjectAgileBoardColumn(models.Model):
    _inherit = 'project.agile.board.column'

    def _min_max_available_for_types(self):
        types = super(ProjectAgileBoardColumn, self)\
            ._min_max_available_for_types()
        types.append('kanban')
        return types
