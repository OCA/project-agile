# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, tools


class WorkflowImporter(models.AbstractModel):
    _inherit = 'project.workflow.importer'

    def prepare_transition(self, transition, states):
        data = super(WorkflowImporter, self).prepare_transition(
            transition, states
        )
        data['task_type_ids'] = [
            (6, 0, self.prepare_transition_task_types(transition))
        ]
        return data

    def prepare_transition_task_types(self, transition):
        task_types = []
        for task_type in transition.get('task_types', []):
            task_type_id = self.prepare_transition_task_type(task_type)
            if task_type_id:
                task_types.append(task_type_id)
        return task_types

    def prepare_transition_task_type(self, task_type):
        return self.get_task_type_id(task_type['name'])

    @tools.ormcache("task_type_name")
    def get_task_type_id(self, task_type_name):
        task_types = self.env['project.task.type2'].search([
            ('name', '=', task_type_name)
        ])

        if task_types.exists():
            return task_types.id

        return False
