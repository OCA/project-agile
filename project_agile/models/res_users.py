# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, exceptions, _


class Users(models.Model):
    _inherit = "res.users"

    name = fields.Char(agile=True)
    write_date = fields.Datetime(agile=True)
    partner_id = fields.Many2one(comodel_name='res.partner', agile=True)

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
        if 'filter_by_team_id' in self.env.context and self.env.context['filter_by_team_id']:
            args.append((
                'team_ids', 'in', [self.env.context['filter_by_team_id']])
            )
        return super(Users, self).name_search(name, args=args, operator=operator, limit=limit)

    @api.multi
    def change_team(self, team_id):
        self.ensure_one()
        if self.id == self.env.user.id and self.team_id in self.team_ids:
            self.sudo().team_id = team_id
            self.env["ir.rule"].invalidate_cache()
        else:
            exceptions.AccessDenied(_("You are allowed only to change current team for yourself"))

    @api.multi
    def fix_team_id(self):
        for record in self:
            if record.team_id not in record.team_ids:
                record.sudo().team_id = record.team_ids[0].id if len(record.team_ids) > 0 else False
        self.env["ir.rule"].invalidate_cache()
