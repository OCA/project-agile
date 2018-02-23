# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, exceptions, _


class Sprint(models.Model):
    _name = 'project.agile.scrum.sprint'
    _inherit = ['project.agile.mixin.id_search']
    _order = 'state, start_date'

    name = fields.Char(
        default=lambda self: self.env['ir.sequence'].next_by_code(
            'project_agile.sprint.sequence'
        ),
    )

    description = fields.Html(default="")
    start_date = fields.Datetime()
    end_date = fields.Datetime()
    actual_end_date = fields.Datetime()

    total_story_points = fields.Integer(
        compute="_compute_total_story_points",
    )

    task_ids = fields.One2many(
        comodel_name="project.task",
        inverse_name="sprint_id",
        string="Tasks",
        required=False,
    )

    team_id = fields.Many2one(
        comodel_name='project.agile.team',
        string='Agile Team',
        required=True,
    )

    team_image_small = fields.Binary(
        string='Team Image',
        related='team_id.image_small'
    )

    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('active', 'Active'),
            ('completed', 'Completed')
        ],
        required=True,
        default='draft',
    )

    velocity = fields.Integer(
        string="Velocity",
        compute="_compute_velocity",
        store=True,
    )

    task_count = fields.Integer(
        string="Task count",
        compute="_compute_task_count",
        store=True,
    )

    order = fields.Float(required=False, default=1)

    active = fields.Boolean(
        string='Active?',
        default=True,
    )

    sprint_length_hrs = fields.Integer(
        compute='_compute_length_hrs',
        string='Sprint length(in hrs)',
        store=True
    )

    sprint_length_days = fields.Integer(
        compute='_compute_length_days',
        string='Sprint length(in days)',
        store=True
    )

    sprint_length_week = fields.Integer(
        compute='_compute_length_week',
        string='Sprint length(in weeks)',
    )

    default_hrs = fields.Float(
        related='team_id.default_hrs',
        string='Default daily hours'
    )

    @api.multi
    @api.depends('task_ids', 'task_ids.story_points')
    def _compute_total_story_points(self):
        for record in self:
            record.total_story_points = sum(
                int(t.story_points) for t in record.task_ids
            )

    @api.multi
    @api.depends('task_ids', 'task_ids.story_points', 'state')
    def _compute_velocity(self):
        for sprint in self:
            sprint.velocity = sum(
                int(t.story_points)
                for t in sprint.task_ids.filtered(
                    lambda x: x.wkf_state_type == "done"
                )
            )

    @api.multi
    @api.depends("task_ids")
    def _compute_task_count(self):
        for record in self:
            record.task_count = len(record.task_ids)

    @api.multi
    @api.depends('start_date', 'end_date')
    def _compute_length_week(self):
        for rec in self:
            rec.sprint_length_week = (rec.sprint_length_days + 1) / 7

    @api.multi
    @api.depends('start_date', 'end_date')
    def _compute_length_days(self):
        for rec in self:
            if rec.start_date and rec.end_date:
                end_date = fields.Date.from_string(rec.end_date)
                start_date = fields.Date.from_string(rec.start_date)
                rec.sprint_length_days = (end_date - start_date).days
            else:
                rec.sprint_length_days = 0

    @api.multi
    @api.depends('start_date', 'end_date')
    def _compute_length_hrs(self):
        for rec in self:
            days = float(rec.sprint_length_days)
            hrs = days * float(rec.default_hrs)
            hrs_int = int(hrs)
            rec.sprint_length_hrs = hrs_int

    @api.model
    @api.returns('self', lambda value: value.id)
    def create(self, vals):
        if not self.env.user.team_id:
            raise exceptions.ValidationError(_(
                "You have to be part of an Agile team in order to "
                "create a new sprint"
            ))

        if 'name' not in vals:
            vals['name'] = "Sprint %s" % self.env.user.team_id.sprint_sequence

        self.env.user.team_id.sprint_sequence += 1

        return super(Sprint, self).create(vals)
