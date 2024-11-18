#!/usr/bin/env python3
# © 2024 TechnoLibre (http://www.technolibre.ca)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

from odoo import fields, models


class ProjectScrumSprint(models.Model):
    _inherit = "project.scrum.sprint"

    epic_ids = fields.Many2many(
        comodel_name="project.scrum.epic",
        string="Epics",
    )
