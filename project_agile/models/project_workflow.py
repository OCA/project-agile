# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class WorkflowTransition(models.Model):
    _inherit = 'project.workflow.transition'

    resolution_id = fields.Many2one(
        comodel_name='project.task.resolution',
        string='Resolution',
    )


class WorkflowState(models.Model):
    _inherit = 'project.workflow.state'

    board_column_status_ids = fields.One2many(
        comodel_name='project.agile.board.column.status',
        inverse_name='state_id',
        string='Columns Statuses'
    )

    @api.multi
    def name_get(self):
        if not self.env.context.get("workflow_name", False):
            return super(WorkflowState, self).name_get()

        result = []
        for rec in self:
            name = "%s (%s)" % (rec.name, rec.workflow_id.name)
            result.append((rec.id, name))
        return result


class WorkflowTaskType(models.Model):
    _name = 'project.workflow.task.type'
    _description = 'Project Workflow Task Type'

    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        string='Workflow',
        required=True,
        ondelete="cascade",
    )

    type_id = fields.Many2one(
        comodel_name='project.task.type2',
        string='Task Type',
        required=True,
    )

    is_default = fields.Boolean(
        string='Is Default?',
        default=False
    )


class Workflow(models.Model):
    _inherit = 'project.workflow'

    task_type_ids = fields.One2many(
        comodel_name='project.workflow.task.type',
        inverse_name='workflow_id',
        string='Task Types',
        copy=True,
    )

    default_task_type_id = fields.Many2one(
        comodel_name='project.workflow.task.type',
        string='Default Task Type',
        compute="_compute_default_task_type_id"
    )

    @api.multi
    @api.depends('task_type_ids', 'task_type_ids.is_default')
    def _compute_default_task_type_id(self):
        for wkf in self:
            for type in wkf.task_type_ids:
                if type.is_default:
                    wkf.default_task_type_id = type
                    break

    @api.multi
    def has_task_type(self, type_id):
        self.ensure_one()
        for task_type in self.task_type_ids:
            if task_type.type_id.id == type_id:
                return True
        return False

    @api.model
    def _populate_state_for_widget(self, transition):
        values = super(Workflow, self)._populate_state_for_widget(transition)
        values['resolution_id'] = transition.resolution_id.id or False
        return values
