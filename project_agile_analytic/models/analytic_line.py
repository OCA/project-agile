# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api
from datetime import datetime


class ProjectAnalyticLine(models.Model):
    _name = 'project.agile.analytic.line'
    _description = "Project Analytic Line"
    _rec_name = "task_id"

    task_id = fields.Many2one(
        comodel_name='project.task',
        string='Task',
        required=True,
        index=True,
        ondelete="cascade",
    )

    type_id = fields.Many2one(
        comodel_name='project.task.type2',
        related='task_id.type_id',
        string='Type',
        readonly=True,
        store=True,
    )

    project_id = fields.Many2one(
        comodel_name='project.project',
        related='task_id.project_id',
        string='Project',
        index=True,
        store=True,
        readonly=True,
    )

    stage_id = fields.Many2one(
        comodel_name='project.task.type',
        string='Stage',
        required=False,
        index=True,
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='Assignee',
        required=False,
        index=True,
    )

    start_date = fields.Datetime(
        string='Start Date',
        required=True,
        index=True,
    )

    end_date = fields.Datetime(
        string='End Date',
        index=True,
    )

    duration = fields.Float(
        string='Duration in hours',
        compute="_compute_duration",
    )

    company_id = fields.Many2one(
        comodel_name='res.company',
        string='Company',
        required=True,
        index=True,
    )

    @api.multi
    def _compute_duration(self):
        for record in self:
            s = fields.Datetime.from_string(record.start_date)
            e = record.end_date and \
                fields.Datetime.from_string(record.end_date) or datetime.now()

            delta = e - s
            hours = delta.total_seconds() / 36000
            record.duration = hours
