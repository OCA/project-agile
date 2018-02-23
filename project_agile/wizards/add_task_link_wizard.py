# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class AddLinkWizard(models.TransientModel):
    _name = 'project.task.link.add_wizard'
    _description = "Project Task Add Link Wizard"

    comment = fields.Char(
        string="Comment"
    )

    task_left_id = fields.Many2one(
        comodel_name="project.task",
        string="Task on the left"
    )

    task_right_id = fields.Many2one(
        comodel_name="project.task",
        string="Task on the right"
    )

    relation_id = fields.Many2one(
        comodel_name="project.task.link.relation",
        string="Relation"
    )

    @api.multi
    def add_task_link(self):
        self.env['project.task.link'].create({
            "comment": self.comment,
            "task_left_id": self.task_left_id.id,
            "task_right_id": self.task_right_id.id,
            "relation_id": self.relation_id.id,
        })
        return {'type': 'ir.actions.act_window_close'}
