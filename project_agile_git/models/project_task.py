# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class ProjectTask(models.Model):
    _inherit = "project.task"

    commit_ids = fields.Many2many(
        comodel_name="project.git.commit",
        agile=True,
    )


class GitCommit(models.Model):
    _inherit = 'project.git.commit'

    @api.multi
    def format_commits(self):
        commits = []

        for commit in self:
            commits.append(commit.format_commit())

        return commits

    @api.multi
    def format_commit(self):
        self.ensure_one()
        return {
            'id': self.id,
            'date': self.date,
            'name': self.name,
            'url': self.url,
            'avatar': self.avatar,
            'message': self.message,
            'message_short': self.message_short,
            'author': {
                'id': self.author_id.id,
                'name': self.author_id.name,
                'avatar': self.author_id.avatar,
                'username': self.author_id.username,
            },
            'branch': {
                'id': self.branch_id.id,
                'name': self.branch_id.name,
                'url': self.branch_id.url,
            },
            'repository': {
                'id': self.repository_id.id,
                'name': self.repository_id.name,
                'url': self.repository_id.url,
                'avatar': self.repository_id.image_type,
            }
        }
