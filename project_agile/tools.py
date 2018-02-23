# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import api


def xmlid_to_res_id(self, xml_id, raise_if_not_found=False):
    return self['ir.model.data'].xmlid_to_res_id(
        xml_id, raise_if_not_found=raise_if_not_found
    )


def xmlid_to_action(self, xml_id):
    module, xml_id = xml_id.split(".")
    return self['ir.actions.act_window'].for_xml_id(module, xml_id)


api.Environment.ref_id = xmlid_to_res_id
api.Environment.ref_action = xmlid_to_action
