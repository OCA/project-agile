# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class Workflow(models.Model):
    _inherit = 'project.workflow'

    def get_available_transitions(self, task, state):
        transitions = super(Workflow, self).get_available_transitions(
            task, state
        )
        task_types = frozenset([task.type_id.id])
        return [
            x
            for x in transitions
            if not (x.task_type_ids and
                    task_types.isdisjoint(x.task_type_ids.ids)
                    )
        ]


class WorkflowTransition(models.Model):
    _inherit = 'project.workflow.transition'

    task_type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        column1='transition_id',
        column2='type_id',
        relation='project_workflow_transition_task_type_rel',
        string='Task Types'
    )
