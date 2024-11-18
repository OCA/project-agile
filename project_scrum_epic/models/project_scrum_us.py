#!/usr/bin/env python3
# © 2024 TechnoLibre (http://www.technolibre.ca)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
from odoo import fields, models


class ProjectScrumUs(models.Model):
    _inherit = "project.scrum.us"

    epic_id = fields.Many2one(comodel_name="project.scrum.epic", string="Epic")
