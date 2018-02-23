# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models, fields, api


class Project(models.Model):
    _inherit = 'project.project'

    agile_method = fields.Selection(
        selection_add=[
            ('scrum', 'Scrum')
        ],
        default='scrum',
    )

    @api.multi
    def agile_scrum_enabled(self):
        self.ensure_one()
        return self.agile_enabled and self.agile_method == 'scrum'


class Task(models.Model):
    _inherit = 'project.task'

    sprint_id = fields.Many2one(
        comodel_name="project.agile.scrum.sprint",
        string="Current sprint",
        domain="[('team_id','=',team_id)]",
    )

    sprint_ids = fields.Many2many(
        comodel_name="project.agile.scrum.sprint",
        column1="task_id",
        column2="sprint_id",
        string="Sprint history",
    )

    sprint_state = fields.Char(compute="_compute_sprint_state", store=True)

    @api.multi
    @api.depends('sprint_id', 'sprint_id.state')
    def _compute_sprint_state(self):
        for record in self:
            record.sprint_state = record.sprint_id.state

    @api.model
    @api.returns('self', lambda value: value.id)
    def create(self, vals):
        new = super(Task, self).create(vals)
        if new.parent_id and new.parent_id.sprint_id:
            new.set_sprint(new.parent_id.sprint_id.id)
        return new

    @api.multi
    def write(self, vals):
        ret = super(Task, self).write(vals)

        if 'stage_id' in vals:
            for rec in self:
                if rec.wkf_state_type == 'done' and not rec.date_end:
                    rec.write({'date_end': fields.Datetime.now()})

        if 'sprint_id' in vals:
            for record in self:
                if len(record.child_ids) > 0:
                    record.child_ids.write({
                        'sprint_id': vals['sprint_id']
                    })
        return ret

    @api.multi
    def set_sprint(self, sprint_id):
        self.write({'sprint_id': sprint_id})
