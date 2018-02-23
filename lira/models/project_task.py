# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class TaskResolution(models.Model):
    _inherit = 'project.task.resolution'

    name = fields.Char(lira=True)


class ProjectTaskLinkRelation(models.Model):
    _inherit = "project.task.link.relation"

    name = fields.Char(lira=True)
    inverse_name = fields.Char(lira=True)
    sequence = fields.Integer(lira=True)


class ProjectTaskLink(models.Model):
    _inherit = "project.task.link"
    _description = "Project Task Link"

    name = fields.Char(lira=True)
    comment = fields.Char(lira=True)
    relation_name = fields.Char(lira=True)
    relation_id = fields.Many2one(
        comodel_name="project.task.link.relation",
        lira=True
    )

    task_left_id = fields.Many2one(
        comodel_name="project.task",
        lira=True,
    )

    task_right_id = fields.Many2one(
        comodel_name="project.task",
        lira=True,
    )

    related_task_id = fields.Many2one(
        comodel_name="project.task",
        lira=True,
    )


class TaskType(models.Model):
    _inherit = 'project.task.type2'

    allow_story_points = fields.Boolean(lira=True)
    allow_sub_tasks = fields.Boolean(lira=True)
    priority_ids = fields.Many2many(
        comodel_name='project.task.priority',
        lira=True
    )
    default_priority_id = fields.Many2one(
        comodel_name='project.task.priority',
        lira=True
    )
    type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        lira=True
    )


class TaskPriority(models.Model):
    _inherit = 'project.task.priority'

    type_ids = fields.Many2many(
        comodel_name='project.task.type2',
        lira=True,
    )


class Task(models.Model):
    _inherit = 'project.task'
    _implements_syncer = True

    name = fields.Char(lira=True)
    key = fields.Char(lira=True)
    effective_hours = fields.Float(lira=True)
    planned_hours = fields.Float(lira=True)
    description = fields.Html(lira=True)
    color = fields.Integer(lira=True)
    date_deadline = fields.Date(lira=True)
    wkf_state_type = fields.Selection(lira=True)
    allow_story_points = fields.Boolean(lira=True)
    is_user_story = fields.Boolean(lira=True)
    is_epic = fields.Boolean(lira=True)
    create_date = fields.Datetime(lira=True)
    write_date = fields.Datetime(lira=True)
    allow_sub_tasks = fields.Boolean(lira=True)
    story_points = fields.Integer(lira=True)
    agile_order = fields.Float(lira=True)
    link_ids = fields.One2many(
        comodel_name="project.task.link",
        lira=True,
        syncer={'inverse_names': ['task_left_id', 'task_right_id']},
    )
    project_id = fields.Many2one(
        comodel_name='project.project',
        lira=True
    )
    parent_id = fields.Many2one(
        comodel_name='project.task',
        lira=True
    )
    stage_id = fields.Many2one(
        comodel_name='project.task.type',
        lira=True
    )
    wkf_state_id = fields.Many2one(
        comodel_name='project.workflow.state',
        lira=True
    )
    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        lira=True
    )
    child_ids = fields.One2many(
        comodel_name='project.task',
        lira=True
    )
    timesheet_ids = fields.One2many(
        comodel_name='account.analytic.line',
        lira=True
    )
    attachment_ids = fields.One2many(
        comodel_name='ir.attachment',
        inverse_name='res_id',
        lira=True
    )
    tag_ids = fields.Many2many(
        comodel_name='project.tags',
        lira=True
    )
    type_id = fields.Many2one(
        comodel_name='project.task.type2',
        lira=True,
    )
    resolution_id = fields.Many2one(
        lira=True,
    )
    project_type_id = fields.Many2one(
        comodel_name='project.type',
        lira=True,
    )
    epic_id = fields.Many2one(
        comodel_name='project.task',
        lira=True,
    )
    user_id = fields.Many2one(
        lira=True
    )
    create_uid = fields.Many2one(
        comodel_name='res.users',
        lira=True,
    )
    priority_id = fields.Many2one(
        comodel_name='project.task.priority',
        lira=True,
    )
    team_id = fields.Many2one(
        comodel_name="project.agile.team",
        lira=True,
    )
    project_last_update = fields.Datetime(
        related='project_id.__last_update',
        readonly=True,
        lira=True
    )
    user_last_update = fields.Datetime(
        related='user_id.__last_update',
        readonly=True,
        lira=True
    )
    stage_name = fields.Char(
        related='stage_id.name',
        readonly=True,
        lira=True
    )
    parent_key = fields.Char(
        related='parent_id.key',
        readonly=True,
        lira=True
    )
    type_lira_icon = fields.Char(
        string='Type Lira Icon',
        related="type_id.lira_icon",
        lira=True,
    )

    type_lira_icon_color = fields.Char(
        string='Type Agile Icon Color',
        related="type_id.lira_icon_color",
        lira=True,
    )

    priority_lira_icon = fields.Char(
        string='Priority Lira Icon',
        related="priority_id.lira_icon",
        lira=True,
    )

    priority_lira_icon_color = fields.Char(
        string='Priority Lira Icon Color',
        related="priority_id.lira_icon_color",
        lira=True,
    )

    @api.multi
    def open_in_lira(self):
        self.ensure_one()
        url = "/lira/web#page=board&project=%s&&view=task&task=%s"

        if self.project_id.agile_enabled:
            return {
                'type': 'ir.actions.act_url',
                'target': 'self',
                'url': url % (self.project_id.id, self.id),
            }

        return False
