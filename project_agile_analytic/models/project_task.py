# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api
from datetime import datetime


class Task(models.Model):
    _inherit = 'project.task'

    analytic_line_ids = fields.One2many(
        comodel_name='project.agile.analytic.line',
        inverse_name='task_id',
        string='Analytic Lines'
    )

    analytic_line_count = fields.Integer(
        string='Analytic Line Count',
        compute="_compute_analytic_line_count"
    )

    analytic_enabled = fields.Boolean(
        related="project_id.analytic_enabled",
        string='Analytic Enabled'
    )

    @api.multi
    def _compute_analytic_line_count(self):
        for record in self:
            record.analytic_line_count = len(record.analytic_line_ids)

    @api.model
    @api.returns('self', lambda value: value.id)
    def create(self, vals):
        task = super(Task, self).create(vals)
        if task.analytic_enabled:
            task.create_task_analytic_line(vals, True)
        return task

    @api.multi
    def write(self, vals):
        for task in self:
            if task.analytic_enabled:
                task.create_task_analytic_line(vals)
        return super(Task, self).write(vals)

    @api.multi
    def create_task_analytic_line(self, vals, create=False):
        self.ensure_one()

        # Let's log stats as root
        analytic_line = self.env['project.agile.analytic.line'].sudo()

        if create:
            analytic_line.create({
                'task_id': self.id,
                'user_id': self.user_id.id,
                'stage_id': self.stage_id.id,
                'start_date': fields.Datetime.to_string(datetime.now()),
                'company_id': self.company_id.id,
            })
        elif 'stage_id' in vals or 'user_id' in vals:

            stage_id = vals.get('stage_id', self.stage_id.id)
            user_id = vals.get('user_id', self.user_id.id)

            if stage_id == self.stage_id.id and user_id == self.user_id.id:
                return

            line = analytic_line.search([
                ('task_id', '=', self.id),
                ('stage_id', '=', self.stage_id.id),
                ('end_date', '=', False)
            ], limit=1)

            line.write({'end_date': fields.Datetime.to_string(datetime.now())})

            analytic_line.create({
                'task_id': self.id,
                'user_id': user_id,
                'stage_id': stage_id,
                'start_date': fields.Datetime.to_string(datetime.now()),
                'company_id': self.company_id.id,
            })
