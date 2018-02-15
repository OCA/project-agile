# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models


class AgileBoardImporter(models.AbstractModel):
    _name = 'project.agile.board.importer'
    _description = 'Agile Board Importer'

    def run(self, reader, stream):
        """
        Runs import process of the given project workflow data stream.
        :param reader: The reader to be used to read the given stream.
        :param stream: The stream of data to be imported.
        :return: Returns
        """
        board = reader.read(stream)
        return self._import_board(board)

    def _import_board(self, board):
        """
        Imports given workflow into odoo database
        :param board: The board to be imported.
        :return: Returns instance of the imported project workflow.
        """

        workflow = self.env['project.workflow'].search([
            ('name', '=', board['workflow'])
        ])
        wkf_states = dict([(s.name, s) for s in workflow.state_ids])

        board_data = self.prepare_board(board, workflow, [
            (0, 0, self.prepare_column(workflow, wkf_states, column))
            for column in board['columns']
        ])

        is_default = board_data.pop('is_default', False)
        the_board = self.env['project.agile.board'].create(board_data)

        if is_default:
            the_board.declare_default()

        return the_board

    def prepare_board(self, board, workflow, column_ids):
        """
        Prepares ``project.workflow`` data.
        :param workflow: The workflow to be mapped to the odoo workflow
        :param state_ids: The list of already odoo mapped states.
        :return: Returns dictionary with workflow data ready to be saved within odoo database.
        """
        return {
            'name': board['name'],
            'workflow_id': workflow.id,
            'description': board['description'],
            'type': board['type'],
            'is_default': board['is_default'],
            'column_ids': column_ids,
        }

    def prepare_column(self, workflow, wkf_states, column):
        """
        Prepares ``project.workflow.state`` dictionary for saving.
        :param state: Parsed state dictionary.
        :return: Returns prepared ``project.workflow.state`` values.
        """
        return {
            'name': column['name'],
            'order': column['order'],
            'status_ids': [(0, 0, self.prepare_status(workflow, wkf_states, status)) for status in column['statuses']]
        }

    def prepare_status(self, workflow, wkf_states, status):
        """
        Prepares ``project.workflow.transition`` dictionary for saving.
        :param transition: Parsed transition dictionary.
        :param states: Dictionary of state browse objects.
        :return: Returns prepared ``project.workflow.transition`` values.
        """
        return {
            'state_id': wkf_states[status['wkf_state']].id,
            'order': status['order'],
        }
