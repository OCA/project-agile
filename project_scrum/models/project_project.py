# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
from odoo import models, fields


class ProjectProject(models.Model):
    _inherit = 'project.project'

    sprint_ids = fields.One2many(
        comodel_name="project.scrum.sprint",
        inverse_name="project_id",
        string="Sprints",
    )
    user_story_ids = fields.One2many(
        comodel_name="project.scrum.us",
        inverse_name="project_id",
        string="User Stories",
    )
    meeting_ids = fields.One2many(
        comodel_name="project.scrum.meeting",
        inverse_name="project_id",
        string="Meetings",
    )
    test_case_ids = fields.One2many(
        comodel_name="project.scrum.test",
        inverse_name="project_id",
        string="Test Cases",
    )
    sprint_count = fields.Integer(
        compute='_compute_sprint_count',
        string="# Sprints",
        index=True,
    )
    user_story_count = fields.Integer(
        compute='_compute_user_story_count',
        string="# User Stories",
    )
    meeting_count = fields.Integer(
        compute='_compute_meeting_count',
        string="# Meetings",
    )
    test_case_count = fields.Integer(
        compute='_compute_test_case_count',
        string="# Test Cases",
    )
    use_scrum = fields.Boolean()
    default_sprintduration = fields.Integer(
        string='Calendar',
        required=False,
        default=14,
        help="Default Sprint time for this project, in days"
    )
    manhours = fields.Integer(
        string='Man Hours',
        required=False,
        help="How many hours you expect this project "
        "needs before it's finished"
    )
    description = fields.Html()

    def _compute_sprint_count(self):
        for p in self:
            p.sprint_count = len(p.sprint_ids)

    def _compute_user_story_count(self):
        for p in self:
            p.user_story_count = len(p.user_story_ids)

    def _compute_meeting_count(self):
        for p in self:
            p.meeting_count = len(p.meeting_ids)

    def _compute_test_case_count(self):
        for p in self:
            p.test_case_count = len(p.test_case_ids)
