# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class MailMessageSubtype(models.Model):
    _inherit = 'mail.message.subtype'

    name = fields.Char(agile=True)
    default = fields.Boolean(agile=True)
    sequence = fields.Integer(agile=True)


class Message(models.Model):
    _inherit = "mail.message"

    author_last_update = fields.Datetime(related='create_uid.__last_update', agile=True)

    def _message_read_dict_postprocess(self, messages, message_tree):
        ret = super(Message, self)._message_read_dict_postprocess(messages, message_tree)

        if self.env.context.get("agile", False):
            for message_dict in messages:
                message = message_tree[message_dict.get('id')]
                message_dict.update({
                    'author_last_update': message.author_last_update,
                    'write_date': message.write_date,
                })
        return ret
