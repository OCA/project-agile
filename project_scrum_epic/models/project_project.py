#!/usr/bin/env python3
# © 2024 TechnoLibre (http://www.technolibre.ca)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
from odoo import api, fields, models


class ProjectProject(models.Model):
    _inherit = "project.project"

    epic_ids = fields.One2many(
        comodel_name="project.scrum.epic",
        inverse_name="project_id",
        string="Epics",
    )
    epic_count = fields.Integer(
        compute="_compute_epic_count", string="# Epics", store=True
    )

    @api.depends("epic_ids")
    def _compute_epic_count(self):
        for project in self:
            project.epic_count = len(project.epic_ids)
