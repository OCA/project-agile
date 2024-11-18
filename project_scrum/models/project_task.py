from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class ProjectTask(models.Model):
    _inherit = "project.task"

    sprint_id = fields.Many2one(
        comodel_name="project.sprint",
        string="Sprint",
        tracking=True,
        domain="['|', ('project_id', '=', False), ('project_id', '=', project_id)]",
    )

    sprint_state = fields.Selection(
        related="sprint_id.state", string="Sprint State", store=True
    )

    @api.constrains("user_ids")
    def _check_user_ids(self):
        for task in self:
            if task.user_ids and task.sprint_id:
                if not task.user_ids <= task.sprint_id.user_ids:
                    raise ValidationError(
                        _("The assignees must be part of the sprint.")
                    )

    @api.onchange("sprint_id")
    def _onchange_sprint_id(self):
        self.user_ids = False
