# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, exceptions, _


class Users(models.Model):
    _inherit = "res.users"

    team_ids = fields.Many2many(
        comodel_name='project.agile.team',
        relation='project_agile_team_member_rel',
        column1='member_id',
        column2='team_id',
        string='Enroled in teams'
    )

    team_id = fields.Many2one(
        comodel_name="project.agile.team",
        string="Current team",
    )

    @api.multi
    def write(self, vals):
        super(Users, self).write(vals)
        if 'team_ids' in vals:
            self.fix_team_id()
        if 'team_id' in vals:
            self.invalidate_cache()
            self.env["ir.rule"].invalidate_cache()

    @api.model
    def name_search(self, name, args=None, operator='ilike', limit=100):
        if args is None:
            args = []

        if 'filter_by_team_id' in self.env.context and \
                self.env.context.get('filter_by_team_id', False):
            args.append((
                'team_ids', 'in', [self.env.context['filter_by_team_id']])
            )

        return super(Users, self).name_search(
            name, args=args, operator=operator, limit=limit
        )

    @api.multi
    def change_team(self, team_id):
        self.ensure_one()
        if self.id == self.env.user.id and self.team_id in self.team_ids:
            self.sudo().team_id = team_id
            self.env["ir.rule"].invalidate_cache()
        else:
            exceptions.AccessDenied(
                _("You are allowed only to change current team for yourself")
            )

    @api.multi
    def fix_team_id(self):
        for record in self:
            if record.team_id not in record.team_ids:
                team_id = False
                if len(record.team_ids) > 0:
                    team_id = record.team_ids[0].id
                record.sudo().team_id = team_id
        self.env["ir.rule"].invalidate_cache()
