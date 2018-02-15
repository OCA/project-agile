# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import base64

import xml.etree.ElementTree as ET

from odoo import models, fields, api


class WorkflowImport(models.TransientModel):
    _name = 'project.agile.jira.workflow.import.wizard'

    name = fields.Char(
        string="Name",
        help="Config Name",
        required=True,
    )

    data = fields.Binary(
        string='Data',
        required=True,
    )

    @api.multi
    def button_import(self):
        self.ensure_one()

        transitions = dict()

        tree = ET.fromstring(base64.decodestring(self.data))

        for action in tree.iter('action'):
            transitions[action.attrib["id"]] = {
                "name": action.attrib["name"],
                "target": action.find("results")[0].attrib["status"]
            }

        return {
            'type': 'ir.actions.act_multi',
            'actions': [
                {'type': 'ir.actions.act_window_close'},
            ]
        }
