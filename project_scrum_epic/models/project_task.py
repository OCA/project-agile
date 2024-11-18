#!/usr/bin/env python3
# © 2024 TechnoLibre (http://www.technolibre.ca)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
from odoo import fields, models


class ProjectTask(models.Model):
    _inherit = "project.task"

    epic_id = fields.Many2one("project.scrum.epic", string="Epic")
