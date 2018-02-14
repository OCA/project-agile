# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import io
import base64

from odoo import models, fields, api


class BoardImportWizard(models.TransientModel):
    _name = 'project.agile.board.import.wizard'

    data = fields.Binary(
        string='Data',
        required=True,
    )

    @api.multi
    def button_import(self):
        self.ensure_one()
        importer = self.get_board_importer()
        reader = self.get_board_xml_reader()
        stream = io.StringIO(base64.b64decode(self.data))
        importer.run(reader, stream)
        stream.close()

        return {
            'type': 'ir.actions.act_multi',
            'actions': [
                {'type': 'ir.actions.act_window_close'},
                {'type': 'ir.actions.act_view_reload'},
            ]
        }

    def get_board_importer(self):
        return self.env['project.agile.board.importer']

    def get_board_xml_reader(self):
        return self.env['project.agile.board.xml.reader']
