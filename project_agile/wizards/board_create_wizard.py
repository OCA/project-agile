# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class BoardCreateWizard(models.TransientModel):
    _name = 'project.agile.board.create.wizard'

    name = fields.Char(
        string='Name',
        required=True
    )

    type = fields.Selection(
        selection=[('scrum', 'Scrum'), ('kanban', 'Kanban')],
        string='Type',
        default='scrum',
        required=True
    )

    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        string='Workflow',
        required=True,
    )

    project_ids = fields.Many2many(
        comodel_name='project.project',
        string='Projects',
        column1='wizard_id',
        column2='project_id',
    )

    visibility = fields.Selection(
        selection=[('global', 'Global'), ('team', 'Team'), ('user', 'User')],
        default='global',
        required=True,
        string='Visibility'
    )

    team_id = fields.Many2one(
        comodel_name='project.agile.team',
        string='Team',
        help='Team which owns this board'
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='User',
        help='User which owns this board',
    )

    @api.multi
    def button_apply(self):
        self.ensure_one()

        board = self.env['project.agile.board'].create(
            self._prepare_agile_board()
        )

        columns = []
        order = 1
        for type in [
            ('todo', 'To Do'), ('in_progress', 'In Progress'), ('done', 'Done')
        ]:
            column = self._prepare_agile_board_column(type, order)
            columns.append((0, False, column))
            order += 1

        board.write({'column_ids': columns})

        self.post_create_hook(board)

        action = self.env.ref_action("project_agile.open_agile_board_form")
        action['res_id'] = board.id
        return action

    def post_create_hook(self, board):
        pass

    def _prepare_agile_board_column(self, type, order):
        return {
            'name': type[1],
            'order': order,
            'status_ids': [
                (0, False, self._prepare_agile_board_state(x))
                for x in self.workflow_id.state_ids if x.type == type[0]
            ],
        }

    def _prepare_agile_board(self):
        return {
            'name': self.name,
            'type': self.type,
            'visibility': self.visibility,
            'team_id': self.team_id and self.team_id.id or False,
            'user_id': self.user_id and self.user_id.id or False,
            'workflow_id': self.workflow_id.id,
            'project_ids': [(6, 0, self.project_ids.ids)],
        }

    def _prepare_agile_board_state(self, state):
        return {
            'name': state.name,
            'state_id': state.id,
        }
