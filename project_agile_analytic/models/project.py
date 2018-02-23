# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class Project(models.Model):
    _inherit = 'project.project'

    analytic_line_ids = fields.One2many(
        comodel_name='project.agile.analytic.line',
        inverse_name='project_id',
        string='Analytic Lines'
    )

    analytic_line_count = fields.Integer(
        string='Analytic Line Count',
        compute="_compute_analytic_line_count"
    )

    analytic_enabled = fields.Boolean(
        compute="_compute_analytic_enabled",
        string='Analytic Enabled'
    )

    @api.multi
    @api.depends("analytic_line_ids")
    def _compute_analytic_line_count(self):
        for record in self:
            record.analytic_line_count = len(record.analytic_line_ids)

    @api.multi
    @api.depends("type_id")
    def _compute_analytic_enabled(self):
        for record in self:
            analytic_enabled = False
            if record.agile_enabled:
                analytic_types = record.get_analytic_types()
                analytic_enabled = record.agile_method in analytic_types
            record.analytic_enabled = analytic_enabled

    def get_analytic_types(self):
        return []
