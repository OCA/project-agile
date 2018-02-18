# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, tools


class AgileTeam(models.Model):
    _name = 'project.agile.team'
    _inherit = ['mail.thread']

    name = fields.Char(
        string='Name',
    )

    description = fields.Html(
        string='Description',
    )

    type = fields.Selection(
        selection=[],
    )

    email = fields.Char(
        string='E-mail',
    )

    member_ids = fields.Many2many(
        comodel_name='res.users',
        relation='project_agile_team_member_rel',
        column1='team_id',
        column2='member_id',
        string='Scrum Members',
    )

    project_ids = fields.Many2many(
        comodel_name="project.project",
        relation="project_project_agile_team_rel",
        column1="team_id",
        column2="project_id",
        string="Projects",
    )

    product_owner_ids = fields.One2many(
        comodel_name='res.users',
        string='Product Owner',
        compute="_compute_product_owner_ids",
    )

    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        string='Workflow',
        required=True,
    )

    default_hrs = fields.Float(
        string='Default daily hours',
        default=8,
    )

    report_ids = fields.One2many(
        comodel_name='project.agile.team.report',
        compute="_compute_report_ids",
    )

    # image: all image fields are base64 encoded and PIL-supported
    image = fields.Binary(
        "Image",
        attachment=True,
        help="This field holds the image used as image for the agile team, "
             "limited to 1024x1024px."
    )

    image_medium = fields.Binary(
        "Medium-sized image",
        compute='_compute_images',
        inverse='_inverse_image_medium',
        store=True,
        attachment=True,
        help="Medium-sized image of the agile team. It is automatically "
             "resized as a 128x128px image, with aspect ratio preserved, "
             "only when the image exceeds one of those sizes. "
             "Use this field in form views or some kanban views."
    )

    image_small = fields.Binary(
        "Small-sized image",
        compute='_compute_images',
        inverse='_inverse_image_small',
        store=True,
        attachment=True,
        help="Small-sized image of the agile team. It is automatically "
             "resized as a 64x64px image, with aspect ratio preserved. "
             "Use this field anywhere a small image is required."
    )

    @api.multi
    @api.depends("project_ids")
    def _compute_product_owner_ids(self):
        for rec in self:
            rec.product_owner_ids = rec.project_ids.mapped("user_id")

    @api.multi
    def _compute_report_ids(self):
        for rec in self:
            rec.report_ids = self.env['project.agile.team.report'].search([
                ('type', '=', rec.type)
            ]).ids or []

    @api.depends('image')
    def _compute_images(self):
        for rec in self:
            rec.image_medium = tools.image_resize_image_medium(
                rec.image, avoid_if_small=True
            )
            rec.image_small = tools.image_resize_image_small(rec.image)

    def _inverse_image_medium(self):
        for rec in self:
            rec.image = tools.image_resize_image_big(rec.image_medium)

    def _inverse_image_small(self):
        for rec in self:
            rec.image = tools.image_resize_image_big(rec.image_small)

    @api.model
    def create(self, vals):
        new = super(AgileTeam, self).create(vals)
        new.member_ids.fix_team_id()
        return new

    @api.multi
    def write(self, vals):
        res = super(AgileTeam, self).write(vals)

        # Set default team for users without one
        if 'member_ids' in vals:
            self.filtered(lambda x: not x.team_id).fix_team_id()
        return res
