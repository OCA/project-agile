# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class ProjectTaskWorklogWizard(models.TransientModel):
    _name = 'project.task.worklog.wizard'

    task_id = fields.Many2one(
        comodel_name='project.task',
        string='Task',
        required=True,
    )

    date = fields.Date(
        string='Date',
        required=True,
        default=lambda *a: fields.Date.today(),
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='User',
        required=True,
        default=lambda s: s.env.user.id
    )

    name = fields.Text(
        string='Description',
        required=True,
    )

    duration = fields.Float(
        string='Duration',
        required=True,
    )

    @api.multi
    def button_submit_worklog(self):
        self.ensure_one()
        self.task_id.timesheet_ids.create(self._prepare_worklog())
        return True

    def _prepare_worklog(self):
        return {
            'project_id': self.task_id.project_id.id or False,
            'date': self.date,
            'user_id': self.user_id.id,
            'name': self.name,
            'unit_amount': self.duration,
        }
