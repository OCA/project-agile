# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, exceptions, _


class Sprint(models.Model):
    _name = 'project.agile.scrum.sprint'
    _inherit = ['project.agile.mixin.id_search']
    _order = 'state, start_date'
    _implements_syncer = True

    name = fields.Char(
        default=lambda self: self.env['ir.sequence'].next_by_code(
            'project_agile.sprint.sequence'
        ),
        agile=True
    )

    description = fields.Html(default="", agile=True)
    start_date = fields.Datetime(agile=True)
    end_date = fields.Datetime(agile=True)
    actual_end_date = fields.Datetime(agile=True)

    total_story_points = fields.Integer(
        compute="_compute_total_story_points",
        agile=True
    )

    task_ids = fields.One2many(
        comodel_name="project.task",
        inverse_name="sprint_id",
        string="Tasks",
        required=False,
        agile=True
    )

    team_id = fields.Many2one(
        comodel_name='project.agile.team',
        string='Agile Team',
        required=True,
        agile=True
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
        agile=True
    )

    velocity = fields.Integer(
        string="Velocity",
        compute="_compute_velocity",
        store=True,
        agile=True
    )

    task_count = fields.Integer(
        string="Task count",
        compute="_compute_task_count",
        store=True,
        agile=True
    )

    order = fields.Float(required=False, default=1, agile=True)

    active = fields.Boolean(
        string='Active?',
        default=True,
        agile=True,
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
                rec.sprint_length_days = (
                        fields.Date.from_string(rec.end_date) -
                        fields.Date.from_string(rec.start_date)
                ).days
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
                "You have to be part of an agile team in order to "
                "create a new sprint"
            ))

        if 'name' not in vals:
            vals['name'] = "Sprint %s" % self.env.user.team_id.sprint_sequence

        self.env.user.team_id.sprint_sequence += 1

        return super(Sprint, self).create(vals)

    @api.multi
    def open_sprint_in_odoo_agile(self):
        self.ensure_one()

        if self.state == 'completed':
            raise exceptions.ValidationError(_(
                "Only future or active sprint can be opened in Odoo Agile!"
            ))

        view_type = 'sprint' if self.state == 'active' else 'backlog'

        return {
            'type': 'ir.actions.act_url',
            'target': 'self',
            'url': "/agile/web#page=board&view=%s" % view_type
        }
