# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, tools


class ProjectAnalyticLineView(models.Model):
    _name = 'project.agile.analytic.line.view'
    _table = 'project_agile_analytic_line_view'
    _description = "Project Analytic Line View"
    _auto = False
    _rec_name = "task_id"

    task_id = fields.Many2one(
        comodel_name='project.task',
        string='Task',
        readonly=True,
    )

    type_id = fields.Many2one(
        comodel_name='project.task.type2',
        string='Type',
        readonly=True,
    )

    project_id = fields.Many2one(
        comodel_name='project.project',
        string='Project',
        readonly=True,
    )

    stage_id = fields.Many2one(
        comodel_name='project.task.type',
        string='Stage',
        readonly=True,
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='Assignee',
        readonly=True,
    )

    start_date = fields.Datetime(
        string='Start Date',
        readonly=True,
    )

    end_date = fields.Datetime(
        string='End Date',
        readonly=True,
    )

    duration = fields.Float(
        string='Duration in hours',
        readonly=True,
    )

    company_id = fields.Many2one(
        comodel_name='res.company',
        string='Company',
        readonly=True,
    )

    @api.model_cr
    def init(self):
        """
            CRM Lead Report
            @param cr: the current row, from the database cursor
        """
        tools.drop_view_if_exists(self._cr, 'project_agile_analytic_line_view')
        self._cr.execute("""
          CREATE OR REPLACE VIEW project_agile_analytic_line_view AS
          SELECT l.id,
                 l.project_id,
                 l.task_id,
                 l. type_id,
                 l.user_id,
                 l.stage_id,
                 l.start_date,
                 l.end_date,
                 l.company_id,
                 COALESCE(EXTRACT(
                  epoch FROM COALESCE(l.end_date, now() at time zone 'utc') -
                  l.start_date)/3600, 0.0::double precision
                 ) AS duration
          FROM project_agile_analytic_line l;
                    """)
