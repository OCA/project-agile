# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
from odoo import models, fields, api
from datetime import date, timedelta


class ProjectScrumSprint(models.Model):
    _name = 'project.scrum.sprint'
    _description = 'Project Scrum Sprint'
    _order = 'date_start desc'

    def get_current_sprint(self, project_id):
        scrum_obj = self.env['project.scrum.sprint']
        sprint = scrum_obj.search([
            '&', '&',
            ('date_start', '<=', date.today()),
            ('date_stop', '>=', date.today()),
            ('project_id', '=', project_id)
        ], limit=1)
        return sprint

    def time_cal(self):
        diff = fields.Date.from_string(self.date_stop) - \
            fields.Date.from_string(self.date_start)
        if diff.days <= 0:
            return 1
        return diff.days + 1

    def _compute_task_count(self):
        for p in self:
            p.task_count = len(p.task_ids)

    name = fields.Char(string='Sprint Name', required=True)
    meeting_ids = fields.One2many(
        comodel_name='project.scrum.meeting',
        inverse_name='sprint_id',
        string='Daily Scrum',
    )
    user_id = fields.Many2one(
        comodel_name='res.users',
        string='Assigned to',
        index=True,
    )
    date_start = fields.Date(string='Starting Date')
    date_stop = fields.Date(string='Ending Date')
    description = fields.Text()
    project_id = fields.Many2one(
        comodel_name='project.project',
        string='Project',
        ondelete='cascade',
        track_visibility='onchange',
        change_default=True,
        required=True,
        index=True,
        help="If you have [?] in the project name, "
        "it means there are no analytic account linked to this project."
    )
    product_owner_id = fields.Many2one(
        comodel_name='res.users',
        string='Product Owner',
        required=False,
        help="The person who responsible for the product",
    )
    scrum_master_id = fields.Many2one(
        comodel_name='res.users',
        string='Scrum Master',
        required=False,
        help="The person who  maintains the processes for the product",
    )
    us_ids = fields.Many2many(
        comodel_name='project.scrum.us',
        string='User Stories',
    )
    task_ids = fields.One2many(
        comodel_name='project.task',
        inverse_name='sprint_id',
    )
    task_count = fields.Integer(compute='_compute_task_count')
    review = fields.Html(
        string='Sprint Review',
        default="""
        <h1 style="color:blue">
            <ul>What was the goal of this sprint?</ul>
        </h1><br/><br/>
        <h1 style="color:blue">
            <ul>Has the goal been reached?</ul></h1>
        <br/><br/>""",
    )
    retrospective = fields.Html(
        string='Sprint Retrospective',
        default="""
        <h1 style="color:blue">
            <ul>What will you start doing in next sprint?</ul></h1>
        <br/><br/>
        <h1 style="color:blue">
            <ul>What will you stop doing in next sprint?</ul></h1>
        <br/><br/>
        <h1 style="color:blue">
            <ul>What will you continue doing in next sprint?</ul></h1>
        <br/><br/>""",
    )
    sequence = fields.Integer(
        help="Gives the sequence order when displaying a list of tasks.",
    )
    planned_hours = fields.Float(
        multi="planned_hours",
        string='Planned Hours',
        help='Estimated time to do the task, '
        'usually set by the project manager when the task is in draft state.',
    )
    state = fields.Selection([
        ('draft', 'Draft'),
        ('open', 'Open'),
        ('pending', 'Pending'),
        ('cancel', 'Cancelled'),
        ('done', 'Done')],
        string='State',
        required=False,
    )
    company_id = fields.Many2one(
        related='project_id.company_id',
    )

    @api.onchange('project_id')
    def onchange_project_id(self):
        if self.project_id and self.project_id.manhours:
            self.planned_hours = self.project_id.manhours
        else:
            self.planned_hours = 0.0

    @api.onchange('date_start')
    def onchange_date_start(self):
        if self.date_start and self.project_id:
            self.date_stop = fields.Date.from_string(self.date_start) +\
                timedelta(days=self.project_id.default_sprintduration)
