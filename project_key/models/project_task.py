# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api
from odoo.osv import expression

TASK_URL = "/web#id=%s&view_type=form&model=project.task&action=%s"


class Task(models.Model):
    _inherit = 'project.task'

    key = fields.Char(
        string='Key',
        size=20,
        required=False,
        index=True,
    )

    url = fields.Char(
        string='URL',
        compute="_compute_task_url",
    )

    _sql_constraints = [
        ("task_key_unique", "UNIQUE(key)", "Task key must be unique!")
    ]

    @api.multi
    def _compute_task_url(self):
        task_action = self.env.ref('project.action_view_task')
        for task in self:
            task.url = TASK_URL % (task.id, task_action.id)

    @api.model
    @api.returns('self', lambda value: value.id)
    def create(self, vals):
        if vals.get('project_id', False):
            project_id = vals['project_id']
        elif self._context.get('default_project_id', False):
            project_id = self._context.get('default_project_id', False)
        elif self._context.get('active_model', False) == 'project.project' and\
                self._context.get('active_id', False):
            project_id = self._context.get('active_id')
        if project_id:
            project = self.env['project.project'].browse(project_id)
            vals['key'] = project.get_next_task_key()
        return super(Task, self).create(vals)

    @api.multi
    def write(self, vals):
        if vals.get('project_id', False):
            project = self.env['project.project'].browse(vals['project_id'])
            for rec in self:
                if not rec.key or rec.project_id.id != project.id:
                    task_data = self._prepare_task_for_project_switch(
                        rec, project
                    )
                    super(Task, rec).write(task_data)
        return super(Task, self).write(vals)

    def _prepare_task_for_project_switch(self, task, project):
        def get_task_data(t):
            t_data = {
                'key': project.get_next_task_key(),
                'project_id': project.id
            }
            if len(t.child_ids) > 0:
                children = []
                for child in t.child_ids:
                    children.append((1, child.id, get_task_data(child)))
                t_data['child_ids'] = children
            return t_data

        return get_task_data(task)

    @api.model
    def name_search(self, name, args=None, operator='ilike', limit=100):
        args = args or []
        domain = []
        if name:
            domain = [
                '|', ('key', 'ilike', name + '%'), ('name', operator, name)
            ]
            if operator in expression.NEGATIVE_TERM_OPERATORS:
                domain = ['&'] + domain
        tasks = self.search(domain + args, limit=limit)
        return tasks.name_get()

    @api.multi
    def name_get(self):
        result = []

        for record in self:
            task_name = []
            if record.key:
                task_name.append(record.key)
            task_name.append(record.name)
            result.append((record.id, " - ".join(task_name)))

        return result
