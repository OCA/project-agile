# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
import io
import base64

from odoo import models, fields, api


class BoardExportWizard(models.TransientModel):
    _name = 'project.agile.board.export.wizard'

    board_id = fields.Many2one(
        comodel_name='project.agile.board',
        string='Agile Board',
    )

    data = fields.Binary(
        string='File',
        readonly="1",
    )

    file_name = fields.Char(
        string='File Name',
        readonly="1",
    )

    state = fields.Selection([
        ('start', 'Start'),
        ('end', 'End'),
    ], default='start')

    @api.multi
    def button_export(self):
        self.ensure_one()

        exporter = self.get_board_xml_writer()

        stream = io.BytesIO()
        exporter.write(self.board_id, stream)
        xml_string = stream.getvalue()
        stream.close()

        file_name = "%s.xml" % self.board_id.name

        self.write({'data': base64.b64encode(xml_string), 'file_name': file_name, 'state': 'end'})

        action = self.env.xmlid_to_action("project_agile.project_agile_board_export_wizard_action")
        action['res_id'] = self.id
        return action

    def get_board_xml_writer(self):
        return self.env['project.agile.board.xml.writer']




