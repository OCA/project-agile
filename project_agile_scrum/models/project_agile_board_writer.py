# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models


class XmlAgileBoardWriter(models.AbstractModel):
    _inherit = 'project.agile.board.xml.writer'

    def prepare_board_attributes(self, board):
        board_attributes = super(XmlAgileBoardWriter, self).prepare_board_attributes(board)
        if board.scrum_task_type_ids:
            board_attributes['scrum_task_type_ids'] = ",".join([x.name for x in board.scrum_task_type_ids])
        return board_attributes
