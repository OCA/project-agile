# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
from odoo import fields, models


class ProjectProject(models.Model):
    _inherit = "project.project"

    sprint_ids = fields.One2many(
        comodel_name="project.scrum.sprint",
        inverse_name="project_id",
        string="Sprints",
    )
    sprint_count = fields.Integer(
        compute="_compute_sprint_count",
        string="# Sprints",
        index=True,
    )
    use_scrum = fields.Boolean()
    default_sprintduration = fields.Integer(
        string="Calendar",
        required=False,
        default=14,
        help="Default Sprint time for this project, in days",
    )
    manhours = fields.Integer(
        string="Man Hours",
        required=False,
        help="How many hours you expect this project " "needs before it's finished",
    )

    def _compute_sprint_count(self):
        for p in self:
            p.sprint_count = len(p.sprint_ids)
