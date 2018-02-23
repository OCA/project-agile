# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class AddSubTaskWizard(models.TransientModel):
    _name = 'project.sub_task.add_wizard'
    _description = "Project Sub-Task Add Wizard"

    def _domain_type_id(self):
        task_id = self.env.context.get('active_id', False)
        if task_id:
            return [('id', 'in', self.task_id.browse(task_id).type_ids.ids)]
        else:
            return []

    project_id = fields.Many2one(
        comodel_name='project.project',
        string='Project',
        readonly=True,
    )

    project_type_id = fields.Many2one(
        comodel_name='project.type',
        related='project_id.type_id',
        string='Project Type'
    )

    task_id = fields.Many2one(
        comodel_name='project.task',
        string='Parent Task',
        readonly=True,
        required=True,
    )

    type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        related="task_id.type_id.type_ids",
        readonly=True,
        string='Allowed Subtypes'
    )

    subject = fields.Char(
        string='Subject',
        required=True,
    )

    description = fields.Html(
        string='Description',
        required=True,
    )

    type_id = fields.Many2one(
        comodel_name='project.task.type2',
        string='Sub-Task Type',
        required=True,
        domain=lambda self: self._domain_type_id(),
    )

    priority_id = fields.Many2one(
        comodel_name='project.task.priority',
        string='Priority',
        required=True,
        domain="[('type_ids', '=', type_id)]"
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='Assignee',
        required=False,
    )

    tag_ids = fields.Many2many(
        comodel_name='project.tags',
        string='Tags'
    )

    story_points = fields.Integer(
        string='Estimate',
    )

    @api.onchange("type_id")
    def onchange_type_id(self):
        priority = False
        if self.type_id:
            priority = self.type_id.default_priority_id

        self.priority_id = priority

    @api.multi
    def add_sub_task(self):
        sub_task = self._populate_sub_task()
        self.env['project.task'].create(sub_task)
        return {'type': 'ir.actions.act_window_close'}

    def _populate_sub_task(self):
        sub_task_values = {
            "project_id": self.project_id.id,
            "parent_id": self.task_id.id,
            "name": self.subject,
            "type_id": self.type_id.id,
            "description": self.description,
            "priority_id": self.priority_id.id or False,
            "user_id": self.user_id.id or False,
            "story_points": self.story_points,
            "tag_ids": [(6, 0, [x.id for x in self.tag_ids])]
        }

        return sub_task_values
